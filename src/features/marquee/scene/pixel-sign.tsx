import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, Color, InstancedMesh, Object3D, SphereGeometry } from "three";
import { useFrame } from "@react-three/fiber";
import { bulbLayout } from "../bulb-layout";
import { signMatrix } from "../pixel-font";

type PixelSignProps = {
  text: string;
  /** Bulb colour, hex. */
  accent: string;
  /** Run the chase pattern around the board. */
  chase: boolean;
  /** Bulbs nearest the pointer flare up. */
  followCursor: boolean;
  /** Sphere segments — the lite tier drops these. */
  segments?: [number, number];
  /** Vertical centre of the board. */
  position?: [number, number, number];
};

const LIT = new Color();
const UNLIT = new Color("#2b3237");

/**
 * The letter board, as three instanced meshes: lit bulbs (unlit material, so
 * they read as emitting), an additive halo behind them for the glow, and the
 * dark bulbs for everything switched off.
 *
 * Per-bulb colour and scale are written back at a throttled rate rather than
 * every frame — the board can hold a few hundred bulbs and the chase pattern
 * does not need 60 Hz updates to look alive.
 */
export function PixelSign({
  text,
  accent,
  chase,
  followCursor,
  segments = [10, 6],
  position = [0, 0, 0],
}: PixelSignProps) {
  const matrix = useMemo(() => signMatrix(text), [text]);

  const bulbs = useMemo(() => bulbLayout(matrix), [matrix]);

  const litBulbs = useMemo(() => bulbs.filter((bulb) => bulb.lit), [bulbs]);
  const darkBulbs = useMemo(() => bulbs.filter((bulb) => !bulb.lit), [bulbs]);

  const litRef = useRef<InstancedMesh>(null);
  const haloRef = useRef<InstancedMesh>(null);
  const darkRef = useRef<InstancedMesh>(null);

  const geometry = useMemo(() => new SphereGeometry(1, segments[0], segments[1]), [segments]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const base = useMemo(() => new Color(accent), [accent]);
  const halo = useMemo(() => new Color(accent), [accent]);

  // Instance positions never change while the text does not.
  useEffect(() => {
    const dummy = new Object3D();
    const radius = 0.042;

    const place = (mesh: InstancedMesh | null, list: typeof bulbs, bulbRadius: number) => {
      if (!mesh) return;
      list.forEach((bulb, index) => {
        dummy.position.set(bulb.x, bulb.y, 0);
        dummy.scale.setScalar(bulbRadius);
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };

    place(litRef.current, litBulbs, radius);
    place(haloRef.current, litBulbs, radius * 2.6);
    place(darkRef.current, darkBulbs, radius * 0.92);
  }, [litBulbs, darkBulbs, text, segments]);

  const accumulators = useRef({ time: 0, hue: 0 });

  useFrame((state, delta) => {
    const accum = accumulators.current;
    accum.time += delta;
    accum.hue += delta;

    // ~24 Hz is plenty for a light chase and leaves the frame budget alone.
    if (accum.time < 0.042) return;
    accum.time = 0;

    if (!litRef.current || !haloRef.current) return;

    const pointerX = followCursor ? state.pointer.x * 3.4 : 0;
    const hasPointer = followCursor && (state.pointer.x !== 0 || state.pointer.y !== 0);
    const chasePhase = accum.hue * 3.2;

    litBulbs.forEach((bulb, index) => {
      let intensity = 1;

      if (chase) {
        // A wave travelling right-to-left across the board.
        intensity = 0.62 + 0.38 * Math.sin(chasePhase - bulb.x * 2.6);
      }

      if (hasPointer) {
        const distance = Math.abs(bulb.x - pointerX);
        intensity = Math.min(1.35, intensity + Math.max(0, 1 - distance / 1.6) * 0.55);
      }

      LIT.copy(base).multiplyScalar(intensity);
      litRef.current!.setColorAt(index, LIT);
      halo.copy(LIT).multiplyScalar(0.35);
      haloRef.current!.setColorAt(index, halo);
    });

    if (litRef.current.instanceColor) litRef.current.instanceColor.needsUpdate = true;
    if (haloRef.current.instanceColor) haloRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <group position={position}>
      {/* The board is decoration: raycasting a few hundred instances on every
          pointer move would cost more than it could ever tell the reader. */}
      <instancedMesh
        ref={litRef}
        args={[geometry, undefined, Math.max(litBulbs.length, 1)]}
        raycast={() => null}
      >
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      <instancedMesh
        ref={haloRef}
        args={[geometry, undefined, Math.max(litBulbs.length, 1)]}
        raycast={() => null}
      >
        <meshBasicMaterial
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
          blending={AdditiveBlending}
        />
      </instancedMesh>

      <instancedMesh
        ref={darkRef}
        args={[geometry, undefined, Math.max(darkBulbs.length, 1)]}
        raycast={() => null}
      >
        <meshStandardMaterial color={UNLIT} metalness={0.6} roughness={0.5} />
      </instancedMesh>
    </group>
  );
}

