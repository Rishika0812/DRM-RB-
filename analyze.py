import pandas as pd, numpy as np, json, warnings
from scipy.optimize import minimize
from arch import arch_model
warnings.filterwarnings('ignore')
X='/mnt/user-data/uploads/Nifty50_Equity_Futures_Options_2006_2026.xlsx'
def col(df,*names):
    for n in names:
        if n in df.columns and df[n].notna().any(): return df[n]
    raise KeyError(names)
def norm(df):  # legacy + UDiFF column handling
    o=pd.DataFrame({'sym':col(df,'SYMBOL','TckrSymb'),'exp':pd.to_datetime(col(df,'EXPIRY_DT','XpryDt'),format='mixed'),
     'K':pd.to_numeric(col(df,'STRIKE_PR','StrkPric')),'typ':col(df,'OPTION_TYP','OptnTp'),
     'close':pd.to_numeric(col(df,'CLOSE','ClsPric')),'settle':pd.to_numeric(col(df,'SETTLE_PR','SttlmPric')),
     'oi':pd.to_numeric(col(df,'OPEN_INT','OpnIntrst')),'vol':pd.to_numeric(col(df,'CONTRACTS','TtlTradgVol')),
     'date':pd.to_datetime(col(df,'TRADE_DATE','TradDt')),'period':df['PERIOD']})
    return o[o.sym=='NIFTY']
x=pd.ExcelFile(X)
eq=x.parse('Nifty50_Equity'); eq['Date']=pd.to_datetime(eq.Date); S=eq.set_index('Date').Close.astype(float)
rs_all=np.log(S).diff(); vol21=rs_all.rolling(21).std()*np.sqrt(252)
F=norm(x.parse('Nifty_Futures')); O=norm(x.parse('Nifty_Options'))
PER={'2008_GFC':('GFC','2008 GFC'),'Mar2020_COVID':('COVID','Mar 2020 COVID'),'Calm_2023':('CALM','Calm 2023'),'Jun2024_Election':('ELEC','Jun 2024 Election')}
LOT=lambda exp: 65 if exp>=pd.Timestamp('2026-01-01') else 75 if exp>=pd.Timestamp('2024-07-25') else 25 if False else None
def lot(exp):  # contract lot by expiry (NSE circulars); 2008 value = assumption
    if exp>=pd.Timestamp('2026-01-01'): return 65
    if exp>=pd.Timestamp('2024-11-20'): return 75  # new lot applies to contracts expiring after transition
    if exp>=pd.Timestamp('2024-07-01'): return 25
    if exp>=pd.Timestamp('2021-07-01'): return 50
    if exp>=pd.Timestamp('2015-01-01'): return 75
    return 50
# ---------- futures near-month returns (same contract over (t-1,t]) ----------
def fut_series(pid):
    f=F[F.period==pid].copy(); f['px']=f.settle.where(f.settle>0,f.close)
    px=f.pivot_table(index='date',columns='exp',values='px'); dates=[d for d in px.index if d in S.index]
    rows=[]; prev=None
    for i in range(1,len(dates)):
        d0,d1=dates[i-1],dates[i]; ex=[e for e in px.columns if e>d0 and not np.isnan(px.loc[d0,e]) and not np.isnan(px.loc[d1,e])]
        if not ex: continue
        e=min(ex); rows.append(dict(date=d1,rf=np.log(px.loc[d1,e]/px.loc[d0,e]),rs=np.log(S[d1]/S[d0]),roll=int(prev is not None and e!=prev),exp=e,F=px.loc[d1,e]))
        prev=e
    return pd.DataFrame(rows).set_index('date')
fs={p:fut_series(p) for p in PER}
# ---------- GARCH / EGARCH (CCC) and BEKK ----------
pool=pd.concat(fs.values()); 
def uni(kind):
    out={}
    prm={}
    for v in ('rs','rf'):
        am=arch_model(pool[v]*100,mean='Zero',vol=kind,p=1,o=1 if kind=='EGARCH' else 0,q=1); r=am.fit(disp='off'); prm[v]=r.params.values
        out[v]=prm[v]
    sig={}
    for p,d in fs.items():
        s={}
        for v in ('rs','rf'):
            am=arch_model(d[v]*100,mean='Zero',vol=kind,p=1,o=1 if kind=='EGARCH' else 0,q=1); s[v]=am.fix(prm[v]).conditional_volatility.values
        sig[p]=s
    z_s=np.concatenate([fs[p].rs.values*100/sig[p]['rs'] for p in fs]); z_f=np.concatenate([fs[p].rf.values*100/sig[p]['rf'] for p in fs])
    rho=np.corrcoef(z_s,z_f)[0,1]
    return {p:np.clip(rho*sig[p]['rs']/sig[p]['rf'],0,2) for p in fs},dict(rho=float(rho),params={k:[round(float(a),4) for a in v] for k,v in prm.items()})
H_garch,I_garch=uni('GARCH'); H_egarch,I_egarch=uni('EGARCH')
data={p:np.c_[d.rs.values,d.rf.values]*100 for p,d in fs.items()}
def bekk_sigmas(th,Y):
    C=np.array([[th[0],0],[th[1],th[2]]]); A=th[3:7].reshape(2,2); B=th[7:11].reshape(2,2); CC=C@C.T
    out={}; 
    for p,y in Y.items():
        S_=np.cov(y.T); L=[]
        for t in range(len(y)):
            L.append(S_.copy()); e=y[t][:,None]; S_=CC+A.T@e@e.T@A+B.T@S_@B
        out[p]=L
    return out
def nll(th):
    A=th[3:7].reshape(2,2); B=th[7:11].reshape(2,2)
    if max(abs(np.linalg.eigvals(np.kron(A,A)+np.kron(B,B))))>=0.9995: return 1e9
    tot=0
    for p,L in bekk_sigmas(th,data).items():
        for t,Sg in enumerate(L):
            d=np.linalg.det(Sg)
            if d<=1e-12: return 1e9
            y=data[p][t]; tot+=0.5*(np.log(d)+y@np.linalg.solve(Sg,y))
    return tot
best=None; cv=np.cov(np.vstack(list(data.values())).T)
for a0,b0 in [(.25,.9),(.15,.95),(.3,.8)]:
    th0=np.r_[np.linalg.cholesky(cv*0.05)[[0,1,1],[0,0,1]],[a0,0,0,a0],[b0,0,0,b0]]
    r=minimize(nll,th0,method='Nelder-Mead',options=dict(maxiter=4000,xatol=1e-4,fatol=1e-5)); r=minimize(nll,r.x,method='Powell',options=dict(maxiter=3000))
    if best is None or r.fun<best.fun: best=r
Lb=bekk_sigmas(best.x,data); H_bekk={p:np.clip(np.array([S_[0,1]/S_[1,1] for S_ in L]),0,2) for p,L in Lb.items()}
I_bekk=dict(nll=float(best.fun),theta=[round(float(a),4) for a in best.x])
# ---------- metrics ----------
def mdd(w): return float(np.max(1-w/np.maximum.accumulate(w)))
def metr(rh,rs):
    rh=np.asarray(rh); rs=np.asarray(rs); L=-rh
    q=lambda a:float(np.quantile(L,a)); v95,v99=q(.95),q(.99)
    cv=lambda v:float(L[L>=v].mean()) if (L>=v).any() else v
    return dict(n=int(len(rh)),VR=float(100*(1-rh.var(ddof=1)/rs.var(ddof=1))),VaR95=100*v95,VaR99=100*v99,CVaR95=100*cv(v95),CVaR99=100*cv(v99),
      LPM2=float(1e4*np.mean(np.maximum(-rh,0)**2)),totRet=100*float(np.expm1(rh.sum())),MDD=100*mdd(np.exp(np.cumsum(rh))),ann_vol=100*float(rh.std(ddof=1)*np.sqrt(252)))
# ---------- futures hedged returns ----------
TC_F=1e-4
FR={}
for p,d in fs.items():
    h_ols=float(np.cov(d.rs,d.rf)[0,1]/d.rf.var()); H={'ols':np.full(len(d),h_ols),'garch':H_garch[p],'egarch':H_egarch[p],'bekk':H_bekk[p]}
    o=d.copy(); o['ols_h']=h_ols
    for k,h in H.items():
        dh=np.abs(np.diff(np.r_[h[0],h])); dh[0]=h[0]; cost=TC_F*(dh+2*h*d.roll.values)
        o[k]=d.rs.values-h*d.rf.values-cost; o[k+'_h']=h; o[k+'_c']=cost
    FR[p]=o
# ---------- options: rolling protective put / collar / put spread ----------
def opt_series(pid):
    o=O[O.period==pid].copy(); o['px']=o.settle.where(o.settle>0,o.close)
    px={ (d,e,k,t):v for d,e,k,t,v in zip(o.date,o.exp,o.K,o.typ,o.px)}
    liq=o[(o.oi>0)|(o.vol>0)].groupby(['exp','typ']).K.apply(lambda s:np.array(sorted(set(s))))
    allk=o.groupby(['exp','typ']).K.apply(lambda s:np.array(sorted(set(s))))
    dates=[d for d in sorted(o.date.unique()) if d in S.index]; exps=sorted(o.exp.unique())
    def near(e,t,target):
        ks=liq.get((e,t),allk[(e,t)]); return float(ks[np.argmin(abs(ks-target))])
    strat={'put':[(+1,'PE',.95)],'collar':[(+1,'PE',.95),(-1,'CE',1.05)],'spread':[(+1,'PE',.95),(-1,'PE',.90)]}
    res={}; legs=[]
    for s,spec in strat.items():
        rows=[]; pos=None; W=None; cycle=0
        for i,d in enumerate(dates):
            Sd=S[d]; prem=0; tau=0
            if pos is not None:
                val=0
                for sg,t,K,e in pos['legs']:
                    v=max(K-Sd,0) if t=='PE' else max(Sd-K,0)
                    if d<e: v=px.get((d,e,K,t),pos['last'].get((K,t),0))
                    pos['last'][(K,t)]=v; val+=sg*v
                dW=(Sd-pos['S'])+(val-pos['val']); W_new=W+dW; r=np.log(W_new/W); W=W_new; pos['S']=Sd; pos['val']=val
                expired=d>=pos['E']
            else: r=np.nan; expired=True
            if expired and i<len(dates)-1 or pos is None:
                E=min(e for e in exps if e>=d+pd.Timedelta(days=7)); legsx=[]; val=0; tcost=0
                for sg,t,m in spec:
                    K=near(E,t,m*Sd); p_=px.get((d,E,K,t),np.nan)
                    if np.isnan(p_): continue
                    legsx.append((sg,t,K,E)); val+=sg*p_; prem+=sg*p_; tcost+=0.005*p_+0.00005*Sd
                tau=tcost; 
                pos=dict(legs=legsx,E=E,S=Sd,val=val,last={(K,t):px[(d,E,K,t)] for _,t,K,_ in legsx}); 
                if W is None: W=Sd+prem
                W-=tau; r=(np.nan if np.isnan(r) else r)+0 if False else r
                if cycle<12: legs.append(dict(strat=s,date=str(d.date()),spot=float(Sd),expiry=str(E.date()),lot=lot(E),legs=[dict(side='long' if sg>0 else 'short',type=t,strike=K,prem=float(px[(d,E,K,t)])) for sg,t,K,_ in legsx],net=float(prem)))
                cycle+=1
            rows.append(dict(date=d,r=r,prem=100*prem/Sd,tau=100*tau/Sd))
        res[s]=pd.DataFrame(rows).set_index('date')
    return res,legs
OR={}; OLEG={}
for p in PER: OR[p],OLEG[p]=opt_series(p)
# ---------- assemble ----------
STR_F=['ols','garch','egarch','bekk']; STR_O=['put','collar','spread']
daily={}; reg={}
for p,(code,label) in PER.items():
    d=FR[p]; od={s:OR[p][s] for s in STR_O}; idx=[t for t in d.index if all(t in od[s].index and not np.isnan(od[s].loc[t,'r']) for s in STR_O)]
    rec=[]
    for t in idx:
        r=dict(d=str(t.date()),S=round(float(S[t]),2),v=round(float(vol21[t]),4),rs=round(float(d.loc[t,'rs']),6))
        for k in STR_F: r[k]=round(float(d.loc[t,k]),6); r[k+'h']=round(float(d.loc[t,k+'_h']),3); r[k+'c']=round(float(d.loc[t,k+'_c'])*100,4)
        for s in STR_O: r[s]=round(float(od[s].loc[t,'r']),6); r[s+'p']=round(float(od[s].loc[t,'prem']),4); r[s+'t']=round(float(od[s].loc[t,'tau']),4)
        rec.append(r)
    daily[code]=rec
    rs=np.array([r['rs'] for r in rec]); m={'unhedged':metr(rs,rs)}
    for k in STR_F: m[k]=metr([r[k] for r in rec],rs); m[k]['cost']=float(sum(r[k+'c'] for r in rec)); m[k]['h']=float(np.mean([r[k+'h'] for r in rec]))
    for s in STR_O: m[s]=metr([r[s] for r in rec],rs); m[s]['cost']=float(sum(r[s+'p']+r[s+'t'] for r in rec)); m[s]['h']=1
    for k in m: m[k]['drag']=m['unhedged']['totRet']-m[k]['totRet']; m[k]['mddRed']=m['unhedged']['MDD']-m[k]['MDD']
    reg[code]=dict(label=label,start=rec[0]['d'],end=rec[-1]['d'],hasFO=True,hOLS=float(FR[p].ols_h.iloc[0]),metrics=m,
      eqVolMean=float(np.mean([r['v'] for r in rec])),legs=OLEG[p])
# pooled
allrec=[r for c in daily for r in daily[c]]; rs=np.array([r['rs'] for r in allrec]); m={'unhedged':metr(rs,rs)}
for k in STR_F: m[k]=metr([r[k] for r in allrec],rs); m[k]['cost']=float(sum(r[k+'c'] for r in allrec)); m[k]['h']=float(np.mean([r[k+'h'] for r in allrec]))
for s in STR_O: m[s]=metr([r[s] for r in allrec],rs); m[s]['cost']=float(sum(r[s+'p']+r[s+'t'] for r in allrec)); m[s]['h']=1
for k in m: m[k]['drag']=m['unhedged']['totRet']-m[k]['totRet']; m[k]['mddRed']=m['unhedged']['MDD']-m[k]['MDD']
# equity-only regimes
def eqstat(a,b):
    r=rs_all[a:b].dropna(); v=vol21[a:b].dropna(); return dict(n=int(len(r)),annVolRealised=float(100*r.std()*np.sqrt(252)),meanVol21=float(100*v.mean()),maxVol21=float(100*v.max()),totRet=float(100*np.expm1(r.sum())),MDD=100*mdd(np.exp(r.cumsum().values)),meanDaily=float(100*r.mean()),VaR95=float(-100*np.quantile(r,.05)),CVaR95=float(-100*r[r<=np.quantile(r,.05)].mean()))
EQW={'GFC':('2008-09-01','2008-12-31'),'COVID':('2020-02-18','2020-05-15'),'CALM':('2023-07-04','2023-09-29'),'ELEC':('2024-05-16','2024-06-28'),'SURGE':('2026-03-02','2026-04-10'),'FULL':('2007-09-18','2026-11-23')}
for c,(a,b) in EQW.items():
    st=eqstat(a,b); mv=st['meanVol21']; st['class']='Extreme' if mv>=30 else 'Elevated' if mv>=16 else 'Calm'
    if c in reg: reg[c]['eq']=st
    else: reg[c]=dict(label={'SURGE':'Mar 2026 Surge','FULL':'Full 2006–2026'}[c],start=a,end=b,hasFO=False,eq=st)
reg['FULL']['pooledFO']=m
for c in ('GFC','COVID','CALM','ELEC'): reg[c]['eq']['class']=reg[c]['eq']['class']
eqd=[[str(d.date()),round(float(S[d]),1),round(float(vol21[d]),3) if not np.isnan(vol21[d]) else None] for d in S.index]
# thin equity series to every 3rd day outside F&O windows? keep all (4.7k rows ~ 150KB)
out=dict(meta=dict(equityFirst=str(S.index[0].date()),equityLast=str(S.index[-1].date()),rows=dict(equity=len(S),futures=len(F),options=len(O)),
  models=dict(garch=I_garch,egarch=I_egarch,bekk=I_bekk),lot=dict(y2008=50,y2020=75,y2023=50,y2024=50,y2026=65)),regimes=reg,equity=eqd,daily=daily)
open('/home/claude/app/lib/analyzedData.ts','w').write('// Generated by analyze.py from Nifty50_Equity_Futures_Options_2006_2026.xlsx\nexport const DATA = '+json.dumps(out,separators=(',',':'))+' as const;\nexport type Data = typeof DATA;\n')
for c,r in reg.items():
    print('\n##',c,r['label'],r['start'],r['end'],'| eq',{k:round(v,2) if isinstance(v,float) else v for k,v in r['eq'].items()})
    if 'metrics' in r:
        print(' hOLS',round(r['hOLS'],3))
        for k,v in r['metrics'].items(): print('  %-9s'%k,{a:round(b,2) for a,b in v.items() if a in('n','VR','VaR95','CVaR95','LPM2','totRet','MDD','cost','drag','mddRed','h')})
print('\nPOOLED');[print('  %-9s'%k,{a:round(b,2) for a,b in v.items()}) for k,v in m.items()]
print(I_garch,I_egarch,I_bekk,sep='\n')
