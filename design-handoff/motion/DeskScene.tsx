/* =========================================================================
   DeskScene — the ANF3 shelf, above the worktop you actually work at.
   -------------------------------------------------------------------------
   Built from photographs of the real cabinet: white melamine carcass, one
   open shelf of A4 lever-arch box files standing on it, each spine printed
   in four bands — code, Thai title over the English subtitle, building and
   ANF3, then bare board with a chrome finger ring.

   The worktop is the working surface. Pick a binder off the shelf and it
   tips out on its ring, comes down and lands open on the worktop; the lamp
   switches the room between day and night; the in-tray holds what you read
   last. Everything the scene can do also exists as a real control in the
   index beside it, and the canvas is aria-hidden — this is the pleasant way
   in, never the only way in.
   ========================================================================= */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { SpineLabel } from './appData';
import { readBinderPaint, readRoomPalette, resolveToken } from './theme';
import type { BinderPaint, RoomPalette } from './theme';
import { shapeById } from './binderShape';
import type { BinderShape, BinderShapeId } from './binderShape';

export type DeskBinderView = {
  id: string;
  groupId: string;
  spine: SpineLabel;
};

export type DeskGroupView = {
  id: string;
  short: string;
  label: string;
  locked: boolean;
  binders: DeskBinderView[];
};

type DeskProps = {
  groups: DeskGroupView[];
  activeGroup: string;
  hoveredBinder: string | null;
  /** The binder currently playing its opening animation, if any. */
  openingBinder: string | null;
  /** The binder the reader just closed, put away on the way back in. */
  returningBinder: string | null;
  theme: string;
  /** Bumped when the reader changes a binder colour, so the scene re-reads
   *  the tokens instead of holding the ones it started with. */
  paletteRevision?: number;
  onPickGroup: (id: string) => void;
  onHoverBinder: (id: string | null) => void;
  onOpenBinder: (id: string) => void;
  /** Which filing format the reader chose to see. Per browser, cosmetic only:
   *  the building hue, the spine label and the record behind it never change. */
  shape?: BinderShapeId;
  /** Called when the GPU drops the context and does not give it back. */
  onContextLost?: () => void;
};

/* ---------------------------- dimensions -------------------------------
   1 unit ≈ 10 cm, so an A4 lever-arch file is 0.7 × 3.2 × 2.6.            */
const SPINE_W = 0.7;
const BINDER_H = 3.2;
const BINDER_D = 2.6;
const GAP = 0.06;
const SHELF_Y = -0.75;
const WORKTOP_Y = -1.98;

/* ---------------------------- spine label ------------------------------ */

function useSpineTexture(spine: SpineLabel, paint: BinderPaint, room: RoomPalette) {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    document.fonts?.ready.then(() => { if (live) setRevision((value) => value + 1); });
    return () => { live = false; };
  }, []);

  return useMemo(() => {
    const W = 320;
    const H = 1400;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext('2d');
    if (context) {
      /* bare board */
      context.fillStyle = paint.spineCss;
      context.fillRect(0, 0, W, H);

      /* band 1 — the code */
      const band1 = Math.round(H * 0.115);
      context.fillStyle = `#${paint.band.getHexString()}`;
      context.fillRect(0, 0, W, band1);
      context.fillStyle = paint.bandInkCss;
      context.font = `700 ${Math.round(W * 0.155)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(spine.code, W / 2, band1 * 0.58, W - 26);

      /* band 2 — the printed title card */
      const cardTop = band1;
      const cardBottom = Math.round(H * 0.63);
      context.fillStyle = room.labelCss;
      context.fillRect(0, cardTop, W, cardBottom - cardTop);

      const lines = [...spine.th, ...spine.en];
      const thCount = spine.th.length;
      const lineHeight = Math.round(W * 0.125);
      const block = lines.length * lineHeight;
      let y = cardTop + (cardBottom - cardTop - block) / 2 + lineHeight * 0.6;
      lines.forEach((line, index) => {
        const isThai = index < thCount;
        context.fillStyle = room.inkCss;
        context.font = `${isThai ? 500 : 400} ${Math.round(W * (isThai ? 0.098 : 0.085))}px "IBM Plex Sans Thai", system-ui, sans-serif`;
        context.fillText(line, W / 2, y, W - 20);
        y += lineHeight;
      });

      /* band 3 — building and department */
      const band3Top = cardBottom;
      const band3Bottom = Math.round(H * 0.79);
      context.fillStyle = `#${paint.band.getHexString()}`;
      context.fillRect(0, band3Top, W, band3Bottom - band3Top);
      context.fillStyle = paint.bandInkCss;
      context.font = `700 ${Math.round(W * 0.092)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
      context.fillText(spine.location, W / 2, band3Top + (band3Bottom - band3Top) * 0.34, W - 18);
      context.font = `700 ${Math.round(W * 0.115)}px "IBM Plex Sans Thai", system-ui, sans-serif`;
      context.fillText('ANF3', W / 2, band3Top + (band3Bottom - band3Top) * 0.74, W - 18);

      /* the embossed board texture below the label, kept very faint */
      context.strokeStyle = 'rgba(0,0,0,0.05)';
      context.lineWidth = 1;
      for (let x = 6; x < W; x += 5) {
        context.beginPath();
        context.moveTo(x, band3Bottom + 4);
        context.lineTo(x, band3Bottom + 16);
        context.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [spine, paint, room, revision]);
}

/* Image-based lighting. Without an environment map a `meshStandardMaterial`
 * has nothing to reflect: metalness goes black and every surface reads as flat
 * plastic, which is exactly what made the first pass look untextured.
 * RoomEnvironment ships inside three, so this costs no download. */
function ImageBasedLight({ intensity }: { intensity: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = target.texture;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  useEffect(() => { scene.environmentIntensity = intensity; }, [scene, intensity]);
  return null;
}

/* A fine, tileable grain used as a roughness and bump map. Board, worktop and
 * melamine are not perfectly smooth; without this they read as vector art. */
function grainTexture(size = 256, contrast = 0.5) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (context) {
    const image = context.createImageData(size, size);
    for (let index = 0; index < image.data.length; index += 4) {
      const base = 150 + (Math.random() - 0.5) * 255 * contrast;
      const value = Math.max(0, Math.min(255, base));
      image.data[index] = value;
      image.data[index + 1] = value;
      image.data[index + 2] = value;
      image.data[index + 3] = 255;
    }
    context.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

function useGrain(repeat: number, contrast = 0.5) {
  return useMemo(() => {
    const texture = grainTexture(256, contrast);
    texture.repeat.set(repeat, repeat);
    return texture;
  }, [repeat, contrast]);
}

const mix = (from: number, to: number, amount: number) => from + (to - from) * amount;
const smooth = (t: number) => t * t * (3 - 2 * t);

function Disposable({ texture }: { texture: THREE.Texture }) {
  useEffect(() => () => texture.dispose(), [texture]);
  return null;
}

/* ------------------------------- binder -------------------------------- */

function Binder({ binder, x, lean, neighbourShift, paint, room, night, form, hovered, chosen, returning, onHover, onOpen }: {
  binder: DeskBinderView;
  x: number;
  lean: number;
  /** −1 or +1 when the neighbour is being fingered, so the row makes room. */
  neighbourShift: number;
  paint: BinderPaint;
  room: RoomPalette;
  night: boolean;
  form: BinderShape;
  hovered: boolean;
  chosen: boolean;
  /** True for the binder the reader has just closed, so it can be put away. */
  returning: boolean;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const cover = useRef<THREE.Group>(null);
  const label = useSpineTexture(binder.spine, paint, room);
  const board = useGrain(3, 0.42);
  const paper = useGrain(2, 0.2);

  /* The binder has four states, and the transition between the shelf and a
   * record page IS one of them — there is no separate page animation.
   *
   *   at rest    standing in the row, the last one leaning
   *   fingered   hover / focus: tipped out on the ring, pivoting about its
   *              bottom front edge, neighbours leaning away to make room
   *   opening    pulled clear of the row, turned to face the reader, front
   *              board swung back on the spine, then pushed toward the camera
   *              until the paper block fills the frame — the last frame is a
   *              sheet of paper, which is what the record page opens on
   *   returning  the reverse, played when you close the binder and land back
   *              on the shelf
   */
  const progress = useRef(0);
  const settled = useRef(!returning);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;

    if (chosen) {
      /* Driven from a clock rather than a lerp so the two stages land in a
         known order and the hand-off to the record page is predictable. */
      progress.current = Math.min(1, progress.current + delta / 0.62);
      const t = progress.current;
      const turn = smooth(Math.min(1, t / 0.62));
      const push = smooth(Math.max(0, (t - 0.42) / 0.58));

      node.position.x = mix(node.position.x, 0, 0.2);
      node.position.y = mix(node.position.y, SHELF_Y + BINDER_H / 2, 0.2);
      node.position.z = 0.62 + turn * 1.9 + push * 4.3;
      node.rotation.x = mix(node.rotation.x, 0, 0.2);
      node.rotation.y = turn * (-Math.PI / 2 + 0.34);
      node.rotation.z = mix(node.rotation.z, 0, 0.2);
      node.scale.setScalar(1 + push * 0.35);
      if (cover.current) cover.current.rotation.y = turn * -2.05;
      return;
    }

    progress.current = 0;
    if (cover.current) cover.current.rotation.y = mix(cover.current.rotation.y, 0, 0.2);
    node.scale.setScalar(mix(node.scale.x, 1, 0.2));

    if (!settled.current) {
      /* Coming back from a record page: start where the opening left off and
         put the binder away, so closing reads as the reverse of opening. */
      node.position.set(0, SHELF_Y + BINDER_H / 2, 7.6);
      node.rotation.set(0, -Math.PI / 2 + 0.34, 0);
      node.scale.setScalar(1.35);
      if (cover.current) cover.current.rotation.y = -2.05;
      settled.current = true;
      return;
    }

    const pivot = hovered ? 0.62 : 0;
    node.position.x = mix(node.position.x, x + neighbourShift * 0.09, 0.2);
    node.position.y = mix(node.position.y, SHELF_Y + BINDER_H / 2 + (hovered ? 0.05 : 0), 0.2);
    node.position.z = mix(node.position.z, pivot, 0.2);
    node.rotation.x = mix(node.rotation.x, hovered ? -0.13 : 0, 0.2);
    node.rotation.y = mix(node.rotation.y, 0, 0.2);
    node.rotation.z = mix(node.rotation.z, lean + neighbourShift * 0.035, 0.2);
  });

  const hit = {
    onPointerOver: (event: { stopPropagation: () => void }) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; onHover(binder.id); },
    onPointerOut: () => { document.body.style.cursor = ''; onHover(null); },
    onClick: (event: { stopPropagation: () => void }) => { event.stopPropagation(); document.body.style.cursor = ''; onOpen(binder.id); }
  };

  const W = form.width;

  return (
    <group ref={group} position={[x, SHELF_Y + BINDER_H / 2, 0]} rotation={[0, 0, lean]}>
      {/* the block of paper inside — only ever seen when the board swings open */}
      <mesh position={[0.02, -0.02, 0]}>
        <boxGeometry args={[Math.max(0.06, W - 0.14), BINDER_H - 0.16, BINDER_D - 0.16]} />
        <meshStandardMaterial color={room['--room-print']} roughness={0.97} metalness={0} roughnessMap={paper} envMapIntensity={0.3} />
      </mesh>

      {/* the board: spine, back cover, and the front cover that swings */}
      <mesh castShadow receiveShadow position={[0, 0, -BINDER_D / 2 + 0.03]} {...hit}>
        <boxGeometry args={[W, BINDER_H, 0.06]} />
        <meshStandardMaterial color={paint.spine} roughness={0.74} metalness={0.02} roughnessMap={board} envMapIntensity={0.4} />
      </mesh>
      <mesh castShadow receiveShadow position={[-W / 2 + 0.03, 0, 0]} {...hit}>
        <boxGeometry args={[0.06, BINDER_H, BINDER_D]} />
        <meshStandardMaterial color={paint.spine} roughness={0.74} metalness={0.02} roughnessMap={board} envMapIntensity={0.4} />
      </mesh>

      {/* an expanding file's concertina sides */}
      {form.pleats && [-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * (BINDER_D / 2 - 0.34)]}>
          {[-0.9, -0.3, 0.3, 0.9].map((step) => (
            <mesh key={step} castShadow position={[0, step * (BINDER_H / 2.6), 0]} rotation={[0, 0, 0]}>
              <boxGeometry args={[W + 0.02, 0.05, 0.13]} />
              <meshStandardMaterial color={paint.band} roughness={0.86} metalness={0} roughnessMap={board} envMapIntensity={0.3} />
            </mesh>
          ))}
        </group>
      ))}

      <group ref={cover} position={[-W / 2 + 0.03, 0, 0]}>
        <mesh castShadow receiveShadow position={[W / 2 - 0.03, 0, BINDER_D / 2 - 0.03]} {...hit}>
          <boxGeometry args={[W, BINDER_H, 0.06]} />
          <meshStandardMaterial color={paint.spine} roughness={0.74} metalness={0.02} roughnessMap={board} bumpMap={board} bumpScale={form.squared ? 0.02 : 0.012} envMapIntensity={0.4} />
        </mesh>

        {/* the printed spine rides on the front board */}
        <mesh position={[W / 2 - 0.03, 0, BINDER_D / 2 + 0.005]}>
          <planeGeometry args={[Math.max(0.08, W - 0.02), BINDER_H - 0.04]} />
          <meshStandardMaterial map={label} roughness={0.92} metalness={0} envMapIntensity={0.22} />
        </mesh>
        <Disposable texture={label} />

        {/* a ring binder carries a clear slip-in pocket rather than a print */}
        {form.furniture === 'pocket' && (
          <mesh position={[W / 2 - 0.03, BINDER_H * 0.06, BINDER_D / 2 + 0.011]}>
            <planeGeometry args={[Math.max(0.06, W - 0.10), BINDER_H * 0.52]} />
            <meshStandardMaterial color={room['--room-chrome']} roughness={0.08} metalness={0.1} transparent opacity={0.22} envMapIntensity={night ? 1.8 : 1.0} />
          </mesh>
        )}

        {/* a box file closes with a clasp on the front edge */}
        {form.furniture === 'clasp' && (
          <mesh castShadow position={[W / 2 - 0.03, BINDER_H * 0.30, BINDER_D / 2 + 0.02]}>
            <boxGeometry args={[Math.max(0.10, W * 0.42), 0.20, 0.05]} />
            <meshStandardMaterial color={room['--room-chrome']} roughness={0.22} metalness={0.9} envMapIntensity={night ? 2.2 : 1.1} />
          </mesh>
        )}

        {/* an expanding file is held shut by an elastic across the face */}
        {form.furniture === 'elastic' && (
          <mesh position={[W / 2 - 0.03, 0, BINDER_D / 2 + 0.014]}>
            <boxGeometry args={[Math.max(0.05, W * 0.16), BINDER_H + 0.06, 0.012]} />
            <meshStandardMaterial color={paint.band} roughness={0.62} metalness={0} envMapIntensity={0.4} />
          </mesh>
        )}

        {/* chrome finger ring — only on formats whose mechanism needs one */}
        {form.ring && <>
          <mesh position={[W / 2 - 0.03, -BINDER_H * 0.31, BINDER_D / 2 + 0.009]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.012, 20]} />
            <meshStandardMaterial color={room['--room-carcass']} roughness={0.9} />
          </mesh>
          <mesh position={[W / 2 - 0.03, -BINDER_H * 0.31, BINDER_D / 2 + 0.013]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.135, 0.028, 12, 32]} />
            <meshStandardMaterial color={room['--room-chrome']} roughness={0.16} metalness={0.95} envMapIntensity={night ? 2.4 : 1.1} />
          </mesh>
        </>}
      </group>
    </group>
  );
}

/* ------------------------------- shelf edge ---------------------------- */

function useChipTexture(text: string, paint: BinderPaint, room: RoomPalette, active: boolean) {
  return useMemo(() => {
    const W = 256;
    const H = 96;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = active ? `#${paint.band.getHexString()}` : room.labelCss;
      context.fillRect(0, 0, W, H);
      context.fillStyle = paint.spineCss;
      context.fillRect(0, 0, W, 14);
      context.fillStyle = active ? paint.bandInkCss : room.mutedCss;
      context.font = `600 40px "IBM Plex Mono", ui-monospace, monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.letterSpacing = '3px';
      context.fillText(text, W / 2, H / 2 + 8);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [text, paint, room, active]);
}

function ShelfChip({ group, x, active, room, paletteRevision = 0, onPick }: {
  group: DeskGroupView;
  x: number;
  active: boolean;
  room: RoomPalette;
  paletteRevision?: number;
  onPick: (id: string) => void;
}) {
  const paint = useMemo(() => readBinderPaint(group.id), [group.id, paletteRevision]);
  const texture = useChipTexture(group.short, paint, room, active);
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (mesh.current) {
      const target = active ? 0.09 : 0;
      mesh.current.position.z += (BINDER_D / 2 + 0.5 + target - mesh.current.position.z) * 0.2;
    }
  });
  return (
    <mesh
      ref={mesh}
      position={[x, SHELF_Y - 0.16, BINDER_D / 2 + 0.5]}
      rotation={[-0.42, 0, 0]}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
      onClick={(event) => { event.stopPropagation(); onPick(group.id); }}
    >
      <planeGeometry args={[0.8, 0.28]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
      <Disposable texture={texture} />
    </mesh>
  );
}

/* -------------------------------- room --------------------------------- */

/* Frame the shelf to whatever shape the panel happens to be. The workbench
 * gives the scene a tall column on a laptop and a short wide band on a
 * stacked phone layout; without this the binders are cropped in one and lost
 * in the other. */
function FitCamera({ height = 5.2, width = 5.5, floor = -2.35 }: { height?: number; width?: number; floor?: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    if (!perspective.isPerspectiveCamera) return;
    const aspect = Math.max(size.width / Math.max(size.height, 1), 0.1);
    const halfFov = (perspective.fov * Math.PI) / 360;
    const distance = Math.max(height / 2, width / 2 / aspect) / Math.tan(halfFov);
    /* Whatever slack the panel's shape leaves goes upward, into the cabinet —
       never downward into empty bench. The bench edge stays on the bottom
       line of the frame at every viewport. */
    const visible = 2 * distance * Math.tan(halfFov);
    const centre = floor + visible / 2;
    perspective.position.set(0, centre, distance);
    perspective.lookAt(0, centre, 0);
    perspective.updateProjectionMatrix();
  }, [camera, size.width, size.height, height, width, floor]);
  return null;
}

function Room({ groups, activeGroup, hoveredBinder, chosen, returningBinder, night, paletteRevision = 0, shape = 'lever-arch', onPickGroup, onHoverBinder, onOpenBinder }: {
  groups: DeskGroupView[];
  activeGroup: string;
  hoveredBinder: string | null;
  chosen: string | null;
  returningBinder: string | null;
  night: boolean;
  paletteRevision?: number;
  shape?: BinderShapeId;
  onPickGroup: (id: string) => void;
  onHoverBinder: (id: string | null) => void;
  onOpenBinder: (id: string) => void;
}) {
  const room = useMemo(() => readRoomPalette(), [night, paletteRevision]); // eslint-disable-line react-hooks/exhaustive-deps
  const melamine = useGrain(6, 0.28);
  const bench = useGrain(4, 0.55);
  const rig = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const move = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (event.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  /* Two degrees of parallax. Enough to feel like a room you are standing in,
     not enough to become an effect. */
  useFrame(() => {
    const node = rig.current;
    if (!node) return;
    node.rotation.y += (pointer.current.x * 0.03 - node.rotation.y) * 0.05;
    node.rotation.x += (pointer.current.y * 0.014 - node.rotation.x) * 0.05;
  });

  const group = groups.find((entry) => entry.id === activeGroup) || groups[0];
  const binders = group?.binders ?? [];
  const form = shapeById(shape as BinderShapeId);
  const span = binders.length * (form.width + GAP) - GAP;
  const start = -span / 2 + form.width / 2;

  const chipSpan = groups.length * 0.88 - 0.08;
  const chipStart = -chipSpan / 2 + 0.4;

  return (
    <group ref={rig}>
      {/* The cabinet runs past both edges of the frame, the way it does when
          you are standing at the bench with the doors open. There is no room
          behind it to see, so none is drawn. */}
      <mesh position={[0, 0.9, -1.62]} receiveShadow>
        <boxGeometry args={[11, 4.6, 0.14]} />
        <meshStandardMaterial color={room['--room-carcass']} roughness={0.82} metalness={0.02} roughnessMap={melamine} envMapIntensity={0.35} />
      </mesh>
      {/* shelf the binders stand on, the one over their heads, and the
          underside of the cabinet above the bench */}
      <mesh position={[0, SHELF_Y - 0.12, -0.3]} receiveShadow castShadow>
        <boxGeometry args={[11, 0.24, 2.9]} />
        <meshStandardMaterial color={room['--room-shelf']} roughness={0.62} metalness={0.03} roughnessMap={melamine} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[0, 2.7, -0.3]} receiveShadow castShadow>
        <boxGeometry args={[11, 0.2, 2.9]} />
        <meshStandardMaterial color={room['--room-shelf']} roughness={0.62} metalness={0.03} roughnessMap={melamine} envMapIntensity={0.4} />
      </mesh>
      <mesh position={[0, SHELF_Y - 0.44, -0.34]} receiveShadow>
        <boxGeometry args={[11, 0.36, 2.7]} />
        <meshStandardMaterial color={room['--room-carcass']} roughness={0.9} />
      </mesh>

      {/* the bench the cabinet hangs over — the working surface */}
      <mesh position={[0, WORKTOP_Y - 0.16, 1.9]} receiveShadow>
        <boxGeometry args={[13, 0.32, 5.2]} />
        <meshStandardMaterial color={room['--room-worktop']} roughness={0.58} metalness={0.04} roughnessMap={bench} bumpMap={bench} bumpScale={0.006} envMapIntensity={0.45} />
      </mesh>
      <mesh position={[0, WORKTOP_Y - 0.34, 4.46]}>
        <boxGeometry args={[13, 0.1, 0.1]} />
        <meshStandardMaterial color={room['--room-worktop-edge']} roughness={0.88} />
      </mesh>
      {/* the wall between bench and cabinet */}
      <mesh position={[0, -1.72, -1.6]} receiveShadow>
        <planeGeometry args={[13, 1.1]} />
        <meshStandardMaterial color={room['--room-wall']} roughness={1} />
      </mesh>

      {binders.map((binder, index) => {
        const focused = binders.findIndex((entry) => entry.id === hoveredBinder);
        const shift = focused < 0 || focused === index ? 0 : index < focused ? -1 : 1;
        return <Binder
          key={binder.id}
          binder={binder}
          x={start + index * (form.width + GAP)}
          lean={index === binders.length - 1 ? 0.045 : 0}
          neighbourShift={shift}
          paint={readBinderPaint(binder.groupId, paletteRevision)}
          form={form}
          room={room}
          night={night}
          hovered={hoveredBinder === binder.id}
          chosen={chosen === binder.id}
          returning={returningBinder === binder.id}
          onHover={onHoverBinder}
          onOpen={onOpenBinder}
        />;
      })}

      {/* shelf-edge labels — one chip per building, the way a real shelf is
          marked up, and the way you change what is on the shelf */}
      {groups.map((entry, index) => (
        <ShelfChip
          key={entry.id}
          group={entry}
          x={chipStart + index * 0.88}
          active={entry.id === activeGroup}
          room={room}
          paletteRevision={paletteRevision}
          onPick={onPickGroup}
        />
      ))}

    </group>
  );
}

/* -------------------------------- root --------------------------------- */

export default function DeskScene({
  groups, activeGroup, hoveredBinder, openingBinder, returningBinder, theme,
  paletteRevision = 0, shape = 'lever-arch', onPickGroup, onHoverBinder, onOpenBinder, onContextLost
}: DeskProps) {
  const night = theme === 'dark';
  const wallColour = useMemo(() => resolveToken('--room-wall'), [theme]);
  const skyColour = useMemo(() => resolveToken('--room-key'), [theme]);
  const bounceColour = useMemo(() => resolveToken('--room-bounce'), [theme]);

  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 9], fov: 34 }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = night ? 1.22 : 0.98;
        /* PCFSoftShadowMap is deprecated in this three version and silently
         * downgrades to PCFShadowMap anyway; ask for what we actually get. */
        gl.shadowMap.type = THREE.PCFShadowMap;

        /* A lost context is normal — the browser drops it on a GPU reset, a
         * driver update, or too many live canvases — but if nothing calls
         * preventDefault() the context is gone for good and the shelf becomes
         * a blank rectangle. Prevent the default so the browser may restore
         * it, and if it has not come back shortly, hand the reader the flat
         * shelf instead of an empty box. */
        const canvas = gl.domElement;
        let restored = false;
        const onLost = (event: Event) => {
          event.preventDefault();
          restored = false;
          window.setTimeout(() => { if (!restored) onContextLost?.(); }, 2500);
        };
        const onRestored = () => { restored = true; };
        canvas.addEventListener('webglcontextlost', onLost as EventListener, false);
        canvas.addEventListener('webglcontextrestored', onRestored, false);
      }}
      onPointerMissed={() => onHoverBinder(null)}
    >
      <color attach="background" args={[wallColour]} />
      <FitCamera />
      <ImageBasedLight intensity={night ? 0.30 : 0.48} />
      <ambientLight intensity={night ? 0.24 : 0.30} />
      <hemisphereLight args={[skyColour, bounceColour, night ? 0.22 : 0.34]} />
      <directionalLight
        position={[2.6, 7.4, 9.5]}
        intensity={night ? 0.92 : 1.22}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-7, 2.5, 6]} intensity={night ? 0.26 : 0.30} />

      <Room
        groups={groups}
        activeGroup={activeGroup}
        hoveredBinder={hoveredBinder}
        chosen={openingBinder}
        returningBinder={returningBinder}
        night={night}
        paletteRevision={paletteRevision}
        shape={shape}
        onPickGroup={onPickGroup}
        onHoverBinder={onHoverBinder}
        onOpenBinder={onOpenBinder}
      />
    </Canvas>
  );
}
