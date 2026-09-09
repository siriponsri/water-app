/* A small, restrained bench-top scene. Every material colour is resolved from
   the same CSS custom properties the rest of the app uses — never a literal
   hex — by painting the token onto a 1x1 canvas and reading back the sRGB
   bytes, because THREE.Color cannot parse oklch() directly.

   It is genuinely interactive, not ambient decoration: the vessel is the
   input surface for the current observation step. Dragging it turns it in
   hand (the way you would tilt a plate to catch the light); clicking it, or
   pressing the real "Inspect" button beside the canvas, commits the same
   objective-description action the caller wires up. The canvas itself is
   aria-hidden — the accessible name lives in the visible caption, and the
   Inspect button is a real, always-present, keyboard-reachable control. When
   WebGL is unavailable or the visitor prefers reduced motion, the whole
   scene degrades to a flat, text-equivalent panel with the same button. */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Search } from 'lucide-react';
import { Component, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import * as THREE from 'three';

export type VesselState = 'clear' | 'turbid' | 'equivocal' | 'msa-yellow' | 'msa-red' | 'mac-clear' | 'mac-pink' | 'mac-pale' | 'xld-red' | 'xld-black' | 'sda-yeast' | 'sda-mold' | 'colonies' | 'control-growth' | 'mixed-growth';

type Props = {
  station: 'receiving' | 'planning' | 'incubator' | 'observation' | 'review';
  vessel: 'plate' | 'tube';
  vesselState: VesselState;
  description: string;
  twoD: boolean;
  dark: boolean;
  reducedMotion: boolean;
  seed: string;
  /** Called when the vessel is dragged/clicked in 3D, or the Inspect control
   *  is used in any presentation — the manipulation that feeds the step. */
  onInspect?: () => void;
};

const CAMERA_ANCHORS: Record<Props['station'], [number, number, number]> = {
  receiving: [-4.6, 3.3, 5.8],
  planning: [-1.8, 3.1, 5.2],
  incubator: [2.6, 3.4, 5.7],
  observation: [0.5, 2.2, 4.3],
  review: [4.4, 3.1, 5.4]
};

const TOKEN_NAMES = [
  '--desk-wood', '--desk-wood-edge', '--desk-cabinet', '--desk-cabinet-dark', '--desk-room', '--desk-floor',
  '--desk-key', '--desk-fill', '--desk-card', '--desk-brass',
  '--color-paper-3', '--color-muted', '--color-warn', '--color-danger',
  '--b10', '--b12', '--b16', '--other', '--reserve'
] as const;

type TokenName = (typeof TOKEN_NAMES)[number];

/** Reads a CSS custom property’s *computed* colour by letting the browser
 *  parse it into a 1x1 canvas, then builds a THREE.Color from the sRGB
 *  bytes — the only reliable way to get an oklch() token into three.js. */
function resolveTokensToThree(names: readonly string[]): Record<string, THREE.Color> {
  const result: Record<string, THREE.Color> = {};
  if (typeof document === 'undefined') { names.forEach((name) => { result[name] = new THREE.Color('#888888'); }); return result; }
  const styles = getComputedStyle(document.documentElement);
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  for (const name of names) {
    const raw = styles.getPropertyValue(name).trim() || '#888888';
    if (!ctx) { result[name] = new THREE.Color('#888888'); continue; }
    ctx.fillStyle = raw;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    result[name] = new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
  }
  return result;
}

function useLabTokens(dark: boolean) {
  // dark is the dependency: the same custom properties resolve to different
  // sRGB bytes once [data-theme] flips, and this hook re-reads them then.
  return useMemo(() => resolveTokensToThree(TOKEN_NAMES), [dark]); // eslint-disable-line react-hooks/exhaustive-deps
}

function CameraRig({ station, reducedMotion }: Pick<Props, 'station' | 'reducedMotion'>) {
  const { camera } = useThree();
  const target = useMemo(() => new THREE.Vector3(...CAMERA_ANCHORS[station]), [station]);
  useFrame((_, delta) => {
    if (reducedMotion) camera.position.copy(target);
    else camera.position.lerp(target, 1 - Math.exp(-delta * 5.5));
    camera.lookAt(0, 0.7, 0);
  });
  return null;
}

function ColonyInstances({ seed, color, count = 34 }: { seed: string; color: THREE.Color; count?: number }) {
  const colonies = useRef<THREE.InstancedMesh>(null);
  const positions = useMemo(() => {
    let value = seed.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) || 1;
    const random = () => { value = (value * 9301 + 49297) % 233280; return value / 233280; };
    return Array.from({ length: count }, () => {
      const radius = Math.sqrt(random()) * 0.78;
      const angle = random() * Math.PI * 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius, 0.06 + random() * 0.025, 0.035 + random() * 0.035] as const;
    });
  }, [count, seed]);
  useLayoutEffect(() => {
    const helper = new THREE.Object3D();
    positions.forEach(([x, z, y, scale], index) => {
      helper.position.set(x, y, z);
      helper.scale.setScalar(scale);
      helper.updateMatrix();
      colonies.current?.setMatrixAt(index, helper.matrix);
    });
    if (colonies.current) colonies.current.instanceMatrix.needsUpdate = true;
  }, [positions]);
  return <instancedMesh ref={colonies} args={[undefined, undefined, count]}>
    <sphereGeometry args={[1, 12, 6]} />
    <meshStandardMaterial color={color} roughness={0.82} />
  </instancedMesh>;
}

function agarColorFor(state: VesselState, tokens: Record<string, THREE.Color>) {
  if (state === 'msa-yellow') return tokens['--other'];
  if (state === 'msa-red') return tokens['--reserve'];
  if (state === 'mac-pink') return tokens['--reserve'];
  if (state === 'xld-red') return tokens['--reserve'];
  if (state === 'xld-black') return tokens['--reserve'];
  if (state === 'sda-yeast') return tokens['--desk-card'];
  if (state === 'sda-mold') return tokens['--b16'];
  if (state === 'mixed-growth') return tokens['--desk-card'];
  return tokens['--desk-card'];
}

function colonyColorFor(state: VesselState, tokens: Record<string, THREE.Color>) {
  if (state === 'sda-mold') return tokens['--b16'];
  if (state === 'sda-yeast') return tokens['--desk-card'];
  if (state === 'mac-pink') return tokens['--reserve'];
  if (state === 'control-growth') return tokens['--color-danger'];
  return tokens['--color-paper-3'];
}

function Plate({ state, seed, tokens }: { state: VesselState; seed: string; tokens: Record<string, THREE.Color> }) {
  const hasColonies = ['colonies', 'msa-yellow', 'msa-red', 'mac-pink', 'mac-pale', 'xld-red', 'xld-black', 'sda-yeast', 'sda-mold', 'control-growth', 'mixed-growth'].includes(state);
  const darkCenter = state === 'xld-black';
  const colonyCount = state === 'control-growth' ? 2 : state === 'mixed-growth' ? 30 : state === 'sda-mold' ? 11 : 38;
  return <group position={[0, 0.78, 0]}>
    <mesh receiveShadow>
      <cylinderGeometry args={[1.08, 1.08, 0.15, 64]} />
      <meshPhysicalMaterial color={tokens['--desk-card']} transparent opacity={0.48} roughness={0.22} transmission={0.2} />
    </mesh>
    <mesh position={[0, 0.09, 0]}>
      <cylinderGeometry args={[0.97, 0.97, 0.08, 64]} />
      <meshStandardMaterial color={agarColorFor(state, tokens)} roughness={0.62} />
    </mesh>
    {hasColonies && <group position={[0, 0.16, 0]}>
      <ColonyInstances seed={seed} color={colonyColorFor(state, tokens)} count={colonyCount} />
      {state === 'mixed-growth' && <ColonyInstances seed={`${seed}-b`} color={tokens['--b16']} count={14} />}
      {darkCenter && <ColonyInstances seed={`${seed}-center`} color={tokens['--desk-cabinet-dark']} count={colonyCount} />}
    </group>}
  </group>;
}

function Tube({ state, tokens }: { state: VesselState; tokens: Record<string, THREE.Color> }) {
  const turbid = state === 'turbid' || state === 'control-growth';
  const equivocal = state === 'equivocal';
  const brothColor = turbid ? tokens['--desk-card'] : equivocal ? tokens['--color-warn'] : tokens['--desk-card'];
  return <group position={[0, 0.2, 0]}>
    <mesh position={[0, 0.9, 0]}>
      <cylinderGeometry args={[0.42, 0.33, 1.8, 32]} />
      <meshPhysicalMaterial color={tokens['--desk-card']} transparent opacity={0.34} transmission={0.5} roughness={0.18} />
    </mesh>
    <mesh position={[0, 0.52, 0]}>
      <cylinderGeometry args={[0.35, 0.29, 1.02, 32]} />
      <meshStandardMaterial color={brothColor} transparent opacity={turbid ? 0.78 : equivocal ? 0.55 : 0.4} roughness={0.7} />
    </mesh>
    <mesh position={[0, 1.86, 0]}>
      <cylinderGeometry args={[0.45, 0.45, 0.22, 32]} />
      <meshStandardMaterial color={tokens['--desk-cabinet-dark']} roughness={0.8} />
    </mesh>
  </group>;
}

/** The one interactive object in the scene. Drag turns it in place; a plain
 *  click (no drag) is treated as "inspect" and calls back to the caller. */
function Vessel({ vessel, vesselState, seed, tokens, onInspect, reducedMotion }: { vessel: Props['vessel']; vesselState: VesselState; seed: string; tokens: Record<string, THREE.Color>; onInspect?: () => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const drag = useRef<{ active: boolean; lastX: number; moved: boolean }>({ active: false, lastX: 0, moved: false });
  const yaw = useRef(0);

  useFrame(() => { if (group.current) group.current.rotation.y = yaw.current; });

  return <group
    ref={group}
    onPointerDown={(event) => { event.stopPropagation(); (event.target as Element).setPointerCapture?.(event.pointerId); drag.current = { active: true, lastX: event.clientX, moved: false }; }}
    onPointerMove={(event) => {
      if (!drag.current.active) return;
      const delta = event.clientX - drag.current.lastX;
      if (Math.abs(delta) > 2) drag.current.moved = true;
      yaw.current += delta * (reducedMotion ? 0.006 : 0.012);
      drag.current.lastX = event.clientX;
    }}
    onPointerUp={(event) => {
      event.stopPropagation();
      const wasDrag = drag.current.moved;
      drag.current.active = false;
      if (!wasDrag) onInspect?.();
    }}
    onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'grab'; }}
    onPointerOut={() => { document.body.style.cursor = 'auto'; }}
  >
    {vessel === 'plate' ? <Plate state={vesselState} seed={seed} tokens={tokens} /> : <Tube state={vesselState} tokens={tokens} />}
  </group>;
}

function Laboratory({ station, vessel, vesselState, reducedMotion, seed, tokens, onInspect }: Omit<Props, 'twoD' | 'description' | 'dark'> & { tokens: Record<string, THREE.Color> }) {
  return <>
    <color attach="background" args={[tokens['--desk-room']]} />
    <fog attach="fog" args={[tokens['--desk-room'], 8, 18]} />
    <ambientLight intensity={0.95} color={tokens['--desk-fill']} />
    <directionalLight castShadow position={[-3, 7, 5]} intensity={1.9} color={tokens['--desk-key']} />
    <pointLight position={[2.8, 2.6, 1.5]} intensity={vesselState === 'control-growth' ? 1.2 : 0.6} color={vesselState === 'control-growth' ? tokens['--color-danger'] : tokens['--desk-brass']} />
    <CameraRig station={station} reducedMotion={reducedMotion} />
    <mesh receiveShadow position={[0, -0.18, 0]}>
      <boxGeometry args={[8.8, 0.35, 3.2]} />
      <meshStandardMaterial color={tokens['--desk-wood']} metalness={0.2} roughness={0.5} />
    </mesh>
    <mesh receiveShadow position={[0, 2.6, -1.65]}>
      <boxGeometry args={[10, 5.8, 0.16]} />
      <meshStandardMaterial color={tokens['--desk-cabinet']} roughness={0.96} />
    </mesh>
    <mesh position={[-3.1, 1.1, -1.1]}>
      <boxGeometry args={[1.35, 2.2, 0.8]} />
      <meshStandardMaterial color={tokens['--desk-wood-edge']} roughness={0.9} />
    </mesh>
    <mesh position={[3.05, 1.15, -1.08]}>
      <boxGeometry args={[1.7, 2.35, 0.95]} />
      <meshStandardMaterial color={tokens['--desk-cabinet-dark']} metalness={0.4} roughness={0.5} />
    </mesh>
    <mesh position={[4.15, 1.15, -1.1]}>
      <boxGeometry args={[0.9, 1.5, 0.18]} />
      <meshStandardMaterial color={tokens['--desk-floor']} roughness={0.65} />
    </mesh>
    <Vessel vessel={vessel} vesselState={vesselState} seed={seed} tokens={tokens} onInspect={onInspect} reducedMotion={reducedMotion} />
  </>;
}

export default function LabScene(props: Props) {
  const [failed, setFailed] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.visibilityState === 'hidden');
  const tokens = useLabTokens(props.dark);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);

  const inspectLabel = `Inspect this ${props.vessel === 'tube' ? 'tube' : 'plate'} closely`;
  const showFlat = props.twoD || props.reducedMotion || failed || !supportsWebgl();

  if (showFlat) return <div className={`lab-fallback vessel-${props.vessel}`}>
    <div className={`fallback-vessel state-${props.vesselState}`} aria-hidden="true"><span /><i /><b /></div>
    <div>
      <strong>{failed ? '2D bench view active' : props.reducedMotion ? '2D bench view (reduced motion)' : '2D bench view'}</strong>
      <p>{props.description}</p>
      <button type="button" className="btn quiet sm" onClick={() => props.onInspect?.()}><Search size={15} aria-hidden="true" />{inspectLabel}</button>
    </div>
  </div>;

  return <div className="lab-canvas">
    <div className="lab-canvas-3d" aria-hidden="true">
      <SceneErrorBoundary onError={() => setFailed(true)}>
        <Canvas shadows frameloop={hidden ? 'never' : 'always'} dpr={[1, 1.5]} camera={{ position: CAMERA_ANCHORS[props.station], fov: 38, near: 0.1, far: 30 }} onCreated={({ gl }) => {
          const canvas = gl.domElement;
          const loseContext = (event: Event) => { event.preventDefault(); setFailed(true); };
          canvas.addEventListener('webglcontextlost', loseContext, { once: true });
        }}>
          <Laboratory {...props} tokens={tokens} />
        </Canvas>
      </SceneErrorBoundary>
    </div>
    <p className="scene-caption">{props.description}</p>
    <button type="button" className="scene-inspect btn sm" onClick={() => props.onInspect?.()}><Search size={14} aria-hidden="true" />{inspectLabel}</button>
  </div>;
}

function supportsWebgl() {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

class SceneErrorBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}
