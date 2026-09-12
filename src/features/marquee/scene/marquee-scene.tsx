import { useEffect, useMemo, useRef, type RefObject } from "react";
import { MathUtils, Object3D, PMREMGenerator, Vector3, type Group, type InstancedMesh } from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { Movie } from "@/data/movies";
import type { MarqueeConfig } from "../config";
import { ACCENTS } from "../config";
import type { CompressionKind } from "../gltf-inspect";
import { signMatrix } from "../pixel-font";
import type { RenderSettings } from "../quality";
import { Centerpiece } from "./centerpiece";
import { CARPET_COLOR, FLOOR_COLOR, WALL_COLOR, surface } from "../materials";
import { CELL_Y, signWidth } from "../bulb-layout";
import { PixelSign } from "./pixel-sign";
import { PosterRail } from "./poster-rail";
import { DroppedModel } from "./dropped-model";

const BOARD_Y = 3.32;
const PEDESTAL_TOP = 0.46;
const TARGET = new Vector3(0, 1.55, 0);

export type MarqueeSceneProps = {
  config: MarqueeConfig;
  settings: RenderSettings;
  movies: Movie[];
  featuredId?: string | number;
  onSelectMovie: (movie: Movie) => void;
  /** -1..1 scroll progress of the canvas through the viewport. */
  scrollRef: RefObject<number>;
  dropped?: { buffer: ArrayBuffer; fileName: string; compression: CompressionKind } | null;
  onModelLoaded?: (triangles: number) => void;
  onModelError?: (message: string) => void;
};

/** Studio reflections without an HDR download: a lit room rendered to a cubemap. */
function StudioEnvironment({ intensity }: { intensity: number }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const target = pmrem.fromScene(room, 0.04);

    scene.environment = target.texture;
    scene.environmentIntensity = intensity;

    room.dispose();

    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);

  return null;
}

/**
 * Orbit controls, driven imperatively so the rest of the scene can read the
 * same camera. Panning is off and two-finger gestures are routed to zoom, which
 * keeps touch input from fighting the page scroll on a phone.
 */
function CameraRig({ autoRotate, onInteract }: { autoRotate: number; onInteract?: () => void }) {
  const camera = useThree((state) => state.camera);
  const domElement = useThree((state) => state.gl.domElement);

  const controls = useMemo(() => new OrbitControls(camera, domElement), [camera, domElement]);

  useEffect(() => {
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3.4;
    controls.maxDistance = 11;
    controls.minPolarAngle = 0.35;
    controls.maxPolarAngle = 1.45;
    controls.target.copy(TARGET);
    // TOUCH.ROTATE for one finger, TOUCH.DOLLY_ROTATE for two.
    controls.touches = { ONE: 0, TWO: 3 };
    controls.addEventListener("start", () => onInteract?.());

    return () => {
      controls.dispose();
    };
  }, [controls, onInteract]);

  useEffect(() => {
    controls.autoRotate = autoRotate > 0;
    controls.autoRotateSpeed = autoRotate * 12;
  }, [controls, autoRotate]);

  useFrame(() => {
    controls.update();
  });

  return null;
}

/**
 * Moves the world, not the camera: scrolling through the page pulls the marquee
 * down and turns it slightly, so the section reads as one continuous camera
 * move and never fights the orbit controls.
 */
function ScrollDrivenWorld({
  scrollRef,
  spinRef,
  children,
}: {
  scrollRef: RefObject<number>;
  /** Written every frame so the reel can speed up with the page. */
  spinRef: RefObject<number>;
  children: React.ReactNode;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    if (!group.current) return;
    const scroll = scrollRef.current ?? 0;

    group.current.position.y = MathUtils.damp(group.current.position.y, -scroll * 0.55, 4, delta);
    group.current.rotation.y = MathUtils.damp(
      group.current.rotation.y,
      scroll * 0.16,
      4,
      delta,
    );
    spinRef.current = MathUtils.damp(spinRef.current ?? 0, Math.abs(scroll) * 1.6, 3, delta);
  });

  return <group ref={group}>{children}</group>;
}

/** A follow spot that tracks the pointer across the facade. */
function FollowSpot({
  enabled,
  accent,
  mouse,
}: {
  enabled: boolean;
  accent: string;
  mouse: RefObject<{ x: number; y: number }>;
}) {
  const light = useRef<Object3D>(null);
  const target = useMemo(() => new Object3D(), []);

  useFrame((_, delta) => {
    if (!light.current) return;
    const pointer = mouse.current ?? { x: 0, y: 0 };
    const x = enabled ? pointer.x * 3.4 : 0;
    const y = enabled ? 2.6 + pointer.y * 0.9 : 2.6;

    light.current.position.x = MathUtils.damp(light.current.position.x, x, 5, delta);
    light.current.position.y = MathUtils.damp(light.current.position.y, y, 5, delta);
    target.position.x = MathUtils.damp(target.position.x, x, 5, delta);
    target.position.y = MathUtils.damp(target.position.y, 1.5, 5, delta);
  });

  return (
    <>
      <primitive object={target} />
      <spotLight
        ref={light}
        position={[0, 2.6, 4.6]}
        target={target}
        angle={0.55}
        penumbra={0.85}
        intensity={38}
        distance={18}
        decay={1.4}
        color={accent}
      />
    </>
  );
}

/**
 * A run of bulbs as one instanced mesh — the canopy edge, and any other strip
 * that is decoration rather than a control. Instancing keeps the whole facade
 * inside a handful of draw calls.
 */
function BulbStrip({
  bulbs,
  color,
  radius,
  segments,
}: {
  bulbs: { x: number; y: number; z: number }[];
  color: string;
  radius: number;
  segments: [number, number];
}) {
  const mesh = useRef<InstancedMesh>(null);

  useEffect(() => {
    if (!mesh.current) return;
    const dummy = new Object3D();
    bulbs.forEach((bulb, index) => {
      dummy.position.set(bulb.x, bulb.y, bulb.z);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [bulbs]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, bulbs.length]} raycast={() => null}>
      <sphereGeometry args={[radius, segments[0], segments[1]]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </instancedMesh>
  );
}

function Pedestal({ finish, wireframe }: { finish: MarqueeConfig["finish"]; wireframe: boolean }) {
  return (
    <group position={[0, 0, 1.45]}>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.62, 0.72, 0.36, 48]} />
        <meshStandardMaterial {...surface(finish, wireframe, 0.6)} />
      </mesh>
      <mesh receiveShadow position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.66, 0.66, 0.05, 48]} />
        <meshStandardMaterial color="#0f1315" metalness={0.4} roughness={0.6} />
      </mesh>
    </group>
  );
}

export function MarqueeScene({
  config,
  settings,
  movies,
  featuredId,
  onSelectMovie,
  scrollRef,
  dropped,
  onModelLoaded,
  onModelError,
}: MarqueeSceneProps) {
  const mouse = useRef({ x: 0, y: 0 });
  const spin = useRef(0);
  const accent = ACCENTS[config.accent].color;

  const board = useMemo(() => signMatrix(config.signText), [config.signText]);
  const wall = useMemo(() => surface(config.finish, config.wireframe, 0.55), [config.finish, config.wireframe]);
  const metal = useMemo(() => surface(config.finish, config.wireframe, 1.05), [config.finish, config.wireframe]);

  const wallBulbs = useMemo(
    () =>
      [-3.9, 3.9].flatMap((x) =>
        [1.4, 2.3, 3.2].map((y) => ({
          key: `${x}-${y}`,
          position: [x, y, -0.5] as [number, number, number],
        })),
      ),
    [],
  );

  const canopyBulbs = useMemo(
    () =>
      Array.from({ length: 19 }, (_, index) => ({
        x: -2.55 + index * 0.283,
        y: 1.92,
        z: 2.12,
      })),
    [],
  );

  return (
    <>
      <color attach="background" args={["#06080a"]} />
      <fog attach="fog" args={["#06080a", 9, 26]} />
      <StudioEnvironment intensity={settings.environmentIntensity} />

      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#9fc6ff", "#1a1410", 0.5]} />

      <directionalLight
        position={[4.5, 7, 5]}
        intensity={2.4}
        castShadow={settings.shadows}
        shadow-mapSize-width={settings.shadowMapSize}
        shadow-mapSize-height={settings.shadowMapSize}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-4.5, 2.6, 3.4]} intensity={14} color={accent} distance={14} decay={1.6} />
      <pointLight position={[4.2, 3.2, 1.6]} intensity={9} color="#5aa0ff" distance={12} decay={1.6} />

      <ScrollDrivenWorld scrollRef={scrollRef} spinRef={spin}>
        {/* Floor and carpet */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[44, 44]} />
          <meshStandardMaterial color={FLOOR_COLOR} metalness={0.35} roughness={0.42} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 1.3]} receiveShadow>
          <planeGeometry args={[3.4, 3.2]} />
          <meshStandardMaterial color={CARPET_COLOR} metalness={0.05} roughness={0.95} />
        </mesh>

        {/* Facade */}
        <mesh position={[0, 2.3, -0.86]} receiveShadow castShadow>
          <boxGeometry args={[9, 4.6, 0.6]} />
          <meshStandardMaterial {...wall} color={WALL_COLOR} />
        </mesh>

        {/* Letter board: dark panel behind the bulbs, bulbs in front of it */}
        <mesh position={[0, BOARD_Y, -0.52]}>
          <boxGeometry args={[signWidth(board.cols) + 0.44, board.rows * CELL_Y + 0.36, 0.12]} />
          <meshStandardMaterial color="#0a0d0f" metalness={0.5} roughness={0.55} />
        </mesh>
        <PixelSign
          text={config.signText}
          accent={accent}
          chase={config.bulbChase}
          followCursor={config.followCursor}
          segments={settings.bulbSegments}
          position={[0, BOARD_Y, -0.4]}
        />

        {/* Canopy */}
        <mesh position={[0, 1.78, 0.55]} castShadow receiveShadow>
          <boxGeometry args={[5.8, 0.42, 2.5]} />
          <meshStandardMaterial {...metal} />
        </mesh>
        <mesh position={[0, 1.58, 1.72]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.16, 20]} />
          <meshStandardMaterial color="#101314" metalness={0.7} roughness={0.4} />
        </mesh>
        <BulbStrip bulbs={canopyBulbs} color={accent} radius={0.045} segments={settings.bulbSegments} />

        {/* Columns */}
        {[-2.35, 2.35].map((x) => (
          <mesh key={x} position={[x, 1, 0.9]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 2, 24]} />
            <meshStandardMaterial {...metal} />
          </mesh>
        ))}

        {/* Two decorative bulb columns flanking the facade */}
        {wallBulbs.map((bulb) => (
          <mesh key={bulb.key} position={bulb.position} raycast={() => null}>
            <sphereGeometry args={[0.07, 12, 8]} />
            <meshBasicMaterial color={accent} toneMapped={false} />
          </mesh>
        ))}

        <PosterRail
          movies={movies.slice(0, settings.posterPanels)}
          finish={config.finish}
          wireframe={config.wireframe}
          featuredId={featuredId}
          onSelect={onSelectMovie}
        />

        <Pedestal finish={config.finish} wireframe={config.wireframe} />

        {dropped ? (
          <DroppedModel
            buffer={dropped.buffer}
            fileName={dropped.fileName}
            compression={dropped.compression}
            wireframe={config.wireframe}
            position={[0, PEDESTAL_TOP, 1.45]}
            onLoaded={onModelLoaded}
            onError={onModelError}
          />
        ) : (
          <group position={[0, PEDESTAL_TOP, 1.45]}>
            <Centerpiece
              part={config.centerpiece}
              finish={config.finish}
              wireframe={config.wireframe}
              accent={accent}
              rpm={0.6 + config.autoRotate * 1.4}
              boost={spin.current ?? 0}
            />
          </group>
        )}
      </ScrollDrivenWorld>

      <FollowSpot enabled={config.followCursor} accent={accent} mouse={mouse} />
      <CameraRig autoRotate={config.autoRotate} />
      <PointerTracker mouse={mouse} />
    </>
  );
}

/** Feeds the normalized pointer position to the light rig without re-rendering. */
function PointerTracker({ mouse }: { mouse: RefObject<{ x: number; y: number }> }) {
  const pointer = useThree((state) => state.pointer);

  useFrame(() => {
    if (!mouse.current) return;
    mouse.current.x = pointer.x;
    mouse.current.y = pointer.y;
  });

  return null;
}
