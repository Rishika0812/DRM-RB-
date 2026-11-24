'use client';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import { N } from '@/lib/model';
const W = 3, HOME = new THREE.Vector3(5.4, 3.6, 6.4);
export type Surf = { h: Float32Array; color: string };

function Surface({ s, onPick }: { s: Surf; onPick: (p: THREE.Vector3) => void }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2 * W, 2 * W, N - 1, N - 1); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position, map = new Uint16Array(p.count);
    for (let i = 0; i < p.count; i++) map[i] = Math.round((p.getZ(i) / (2 * W) + 0.5) * (N - 1)) * N + Math.round((p.getX(i) / (2 * W) + 0.5) * (N - 1));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(p.count * 3), 3)); g.userData.map = map; return g;
  }, []);
  const cur = useRef(new Float32Array(N * N)); const tgt = useRef(s.h); tgt.current = s.h;
  const acc = useMemo(() => new THREE.Color(s.color), [s.color]);
  const tmp = useMemo(() => new THREE.Color(), []);
  const amber = useMemo(() => new THREE.Color('#F59E0B'), []), red = useMemo(() => new THREE.Color('#EF4444'), []), white = useMemo(() => new THREE.Color('#ffffff'), []);
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.05) * 5), p = geo.attributes.position, c = geo.attributes.color, map = geo.userData.map as Uint16Array;
    for (let i = 0; i < p.count; i++) {
      const j = map[i]; cur.current[j] += (tgt.current[j] - cur.current[j]) * k; const y = cur.current[j], e = y / 1.6; p.setY(i, y);
      if (e >= 0) tmp.copy(acc).lerp(white, Math.min(1, e) * 0.45); else if (e > -0.5) tmp.copy(acc).lerp(amber, -e * 2); else tmp.copy(amber).lerp(red, Math.min(1, (-e - 0.5) * 2));
      c.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    p.needsUpdate = true; c.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  });
  return (<>
    <mesh geometry={geo} onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onPick(e.point.clone()); }}>
      <meshStandardMaterial vertexColors transparent opacity={0.78} side={THREE.DoubleSide} roughness={0.55} metalness={0.2} />
    </mesh>
    <mesh geometry={geo}><meshBasicMaterial wireframe color={s.color} transparent opacity={0.28} /></mesh>
  </>);
}
function Rig({ recenter }: { recenter: number }) {
  const { camera, controls } = useThree() as any; const on = useRef(false);
  useEffect(() => { if (recenter) on.current = true; }, [recenter]);
  useFrame((_, dt) => {
    if (!on.current || !controls) return; const k = 1 - Math.exp(-dt * 6);
    camera.position.lerp(HOME, k); controls.target.lerp(new THREE.Vector3(0, 0, 0), k); controls.update();
    if (camera.position.distanceTo(HOME) < 0.02) on.current = false;
  });
  return null;
}
export default function Scene({ surfaces, pick, onPick, recenter }: { surfaces: Surf[]; pick: THREE.Vector3 | null; onPick: (p: THREE.Vector3) => void; recenter: number }) {
  const lab = 'num text-[9px] tracking-widest text-white/40 whitespace-nowrap pointer-events-none select-none';
  return (
    <Canvas camera={{ position: HOME.toArray(), fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }} style={{ touchAction: 'none' }}>
      <color attach="background" args={['#000000']} />
      <ambientLight intensity={0.7} /><directionalLight position={[4, 8, 5]} intensity={1.1} />
      <gridHelper args={[2 * W, 12, '#2a3140', '#12161e']} position={[0, -1.95, 0]} />
      {surfaces.map((s, i) => <Surface key={i} s={s} onPick={onPick} />)}
      {pick && (<mesh position={pick}><sphereGeometry args={[0.07, 20, 20]} /><meshBasicMaterial color="#ffffff" /></mesh>)}
      <Html position={[W + 0.2, -1.95, 0]} center><div className={lab}>SPOT MOVE →</div></Html>
      <Html position={[0, -1.95, W + 0.3]} center><div className={lab}>REALISED VOL →</div></Html>
      <Html position={[-W, 1.9, -W]} center><div className={lab}>HEDGED RETURN ↑</div></Html>
      <OrbitControls makeDefault enablePan={false} enableDamping dampingFactor={0.08} minDistance={4} maxDistance={16} maxPolarAngle={Math.PI * 0.62} touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }} />
      <Rig recenter={recenter} />
    </Canvas>
  );
}
