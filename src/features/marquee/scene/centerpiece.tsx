import { useRef } from "react";
import { Group } from "three";
import { useFrame } from "@react-three/fiber";
import type { CenterpieceKey, FinishKey } from "../config";
import { surface } from "../materials";

type CenterpieceProps = {
  part: CenterpieceKey;
  finish: FinishKey;
  wireframe: boolean;
  accent: string;
  /** Revolutions per minute of the turntable. */
  rpm: number;
  /** Extra spin applied briefly when a movie is featured. */
  boost?: number;
};

/**
 * The object on the pedestal — the part that gets swapped.
 *
 * Three procedural stand-ins (reel, projector, film can) rather than shipped
 * models: they cost no download, they take the configurator's finish straight
 * from the material props, and swapping one for another is a single state
 * change the user can see and hear about.
 */
export function Centerpiece({ part, finish, wireframe, accent, rpm, boost = 0 }: CenterpieceProps) {
  const turntable = useRef<Group>(null);
  const metal = surface(finish, wireframe, 1.1);
  const matte = surface(finish, wireframe, 0.6);

  useFrame((_, delta) => {
    if (!turntable.current) return;
    const revolutionsPerSecond = (rpm * (1 + boost)) / 60;
    turntable.current.rotation.y += revolutionsPerSecond * Math.PI * 2 * delta;
  });

  return (
    <group ref={turntable}>
      {part === "reel" && <FilmReel metal={metal} matte={matte} />}
      {part === "projector" && <Projector metal={metal} matte={matte} accent={accent} />}
      {part === "film-can" && <FilmCan metal={metal} accent={accent} />}
    </group>
  );
}

type Surface = ReturnType<typeof surface>;

function FilmReel({ metal, matte }: { metal: Surface; matte: Surface }) {
  const spokes = [0, 60, 120, 180, 240, 300];

  return (
    <group rotation={[0, 0, 0]}>
      {[-0.14, 0.14].map((z) => (
        <group key={z} position={[0, 0, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.5, 0.5, 0.05, 48]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh>
            <torusGeometry args={[0.5, 0.035, 12, 48]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          {spokes.map((angle) => (
            <mesh key={angle} rotation={[0, 0, (angle * Math.PI) / 180]} position={[0, 0, 0.035]}>
              <boxGeometry args={[0.07, 0.4, 0.03]} />
              <meshStandardMaterial {...matte} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.34, 24]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0, 0, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.06, 20]} />
          <meshStandardMaterial {...metal} />
        </mesh>
      ))}
    </group>
  );
}

function Projector({ metal, matte, accent }: { metal: Surface; matte: Surface; accent: string }) {
  return (
    <group position={[0, -0.06, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.12, 0.56]} />
        <meshStandardMaterial {...matte} />
      </mesh>

      <mesh position={[0, 0.28, -0.02]} castShadow>
        <boxGeometry args={[0.54, 0.4, 0.46]} />
        <meshStandardMaterial {...metal} />
      </mesh>

      {[-0.14, 0, 0.14].map((x) => (
        <mesh key={x} position={[x, 0.28, 0.22]}>
          <boxGeometry args={[0.05, 0.3, 0.02]} />
          <meshStandardMaterial {...matte} />
        </mesh>
      ))}

      <mesh position={[0, 0.3, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.13, 0.18, 32]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0, 0.3, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 32]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>

      {[-0.16, 0.16].map((x) => (
        <group key={x} position={[x, 0.54, -0.02]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.17, 0.03, 32]} />
            <meshStandardMaterial {...metal} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.17, 0.02, 8, 32]} />
            <meshStandardMaterial {...matte} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FilmCan({ metal, accent }: { metal: Surface; accent: string }) {
  return (
    <group position={[0, -0.05, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.3, 48]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.44, 0.44, 0.05, 48]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <torusGeometry args={[0.43, 0.018, 8, 48]} />
        <meshStandardMaterial {...metal} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.425, 0.425, 0.09, 48]} />
        <meshBasicMaterial color={accent} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.14, 0.028, 8, 24]} />
        <meshStandardMaterial {...metal} />
      </mesh>
    </group>
  );
}
