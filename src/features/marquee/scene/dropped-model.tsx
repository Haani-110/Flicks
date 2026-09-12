import { useEffect, useState } from "react";
import { Box3, Material, Mesh, Vector3, type Object3D } from "three";
import type { CompressionKind } from "../gltf-inspect";

type DroppedModelProps = {
  /** The dropped .glb, already inspected by gltf-inspect. */
  buffer: ArrayBuffer;
  fileName: string;
  compression: CompressionKind;
  wireframe: boolean;
  /** Called once the model is in the scene, for a status line. */
  onLoaded?: (triangles: number) => void;
  onError?: (message: string) => void;
  /** Where the model should sit, centred. */
  position?: [number, number, number];
  /** Longest edge after normalising, in world units. */
  targetSize?: number;
};

/**
 * Loads a dropped glTF binary into the pedestal spot, auto-centred and scaled.
 *
 * The loaders are imported on demand: GLTFLoader only when a file is actually
 * dropped, and the DRACO / meshopt decoders only for files whose extensions ask
 * for them. Both decoders come from the three package, so a compressed model
 * opens with no CDN in the path.
 */
export function DroppedModel({
  buffer,
  fileName,
  compression,
  wireframe,
  onLoaded,
  onError,
  position = [0, 0, 0],
  targetSize = 1.4,
}: DroppedModelProps) {
  const [object, setObject] = useState<Object3D | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: Object3D | null = null;

    (async () => {
      try {
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();

        if (compression.includes("draco")) {
          const { DRACOLoader } = await import("three/addons/loaders/DRACOLoader.js");
          const draco = new DRACOLoader();
          // three resolves its decoder files relative to its own module, so the
          // bundler emits them next to this chunk. They are fetched only when a
          // DRACO-compressed model is parsed — no CDN, and nothing to copy into
          // public/.
          loader.setDRACOLoader(draco);
        }

        if (compression.includes("meshopt")) {
          const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
          loader.setMeshoptDecoder(MeshoptDecoder);
        }

        const gltf = await loader.parseAsync(buffer, "");

        if (cancelled) {
          disposeTree(gltf.scene);
          return;
        }

        const scene = gltf.scene;
        normalize(scene, targetSize);

        let triangles = 0;
        scene.traverse((child) => {
          if (!(child instanceof Mesh)) return;
          child.castShadow = true;
          child.receiveShadow = true;
          const geometry = child.geometry;
          if (geometry.index) triangles += geometry.index.count / 3;
          else if (geometry.attributes.position) triangles += geometry.attributes.position.count / 3;
        });

        loaded = scene;
        setObject(scene);
        onLoaded?.(Math.round(triangles));
      } catch (error) {
        if (cancelled) return;
        onError?.(
          error instanceof Error
            ? `${fileName} could not be read: ${error.message}`
            : `${fileName} could not be read.`,
        );
      }
    })();

    return () => {
      cancelled = true;
      if (loaded) disposeTree(loaded);
    };
    // Re-running on every wireframe change would reload the model; the wireframe
    // pass below handles that instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buffer, fileName, compression, onLoaded, onError, targetSize]);

  useEffect(() => {
    if (!object) return;

    object.traverse((child) => {
      if (!(child instanceof Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material: Material) => {
        const withWireframe = material as Material & { wireframe?: boolean };
        if (typeof withWireframe.wireframe === "boolean") {
          withWireframe.wireframe = wireframe;
          material.needsUpdate = true;
        }
      });
    });
  }, [object, wireframe]);

  if (!object) return null;

  return <primitive object={object} position={position} />;
}

/**
 * Scales the model's longest edge to `size`, centres it left to right and front
 * to back, and puts its base on the origin so it stands on the pedestal instead
 * of sinking through it.
 */
function normalize(object: Object3D, size: number) {
  object.updateWorldMatrix(true, true);
  const box = new Box3().setFromObject(object);
  const dimensions = box.getSize(new Vector3());
  const longest = Math.max(dimensions.x, dimensions.y, dimensions.z);

  if (longest > 0) {
    object.scale.multiplyScalar(size / longest);
  }

  object.updateWorldMatrix(true, true);
  const scaled = new Box3().setFromObject(object);
  const center = scaled.getCenter(new Vector3());

  object.position.x -= center.x;
  object.position.y -= scaled.min.y;
  object.position.z -= center.z;
}

function disposeTree(root: Object3D) {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      Object.values(material).forEach((value) => {
        const candidate = value as { isTexture?: boolean; dispose?: () => void } | null;
        if (candidate?.isTexture && typeof candidate.dispose === "function") {
          candidate.dispose();
        }
      });
      material.dispose();
    });
  });
}
