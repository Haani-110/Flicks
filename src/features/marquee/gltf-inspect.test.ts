import { describe, expect, it } from "vitest";
import {
  compressionOf,
  describeInspection,
  formatBytes,
  inspectGltfFile,
  MAX_GLB_BYTES,
  type GltfInspection,
} from "./gltf-inspect";

/** Builds a real glTF binary header around a JSON chunk, like an exporter would. */
function buildGlb(json: Record<string, unknown>, binChunk = 0): ArrayBuffer {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  const binPadding = (4 - (binChunk % 4)) % 4;

  const jsonLength = jsonBytes.length + jsonPadding;
  const binLength = binChunk > 0 ? binChunk + binPadding : 0;
  const total = 12 + 8 + jsonLength + (binLength > 0 ? 8 + binLength : 0);

  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  bytes.set(jsonBytes, 20);
  for (let index = 0; index < jsonPadding; index += 1) bytes[20 + jsonBytes.length + index] = 0x20;

  if (binLength > 0) {
    const offset = 20 + jsonLength;
    view.setUint32(offset, binLength, true);
    view.setUint32(offset + 4, 0x004e4942, true); // "BIN"
  }

  return buffer;
}

const SIMPLE = {
  asset: { version: "2.0" },
  meshes: [{ name: "reel" }],
  materials: [{ name: "chrome" }],
  nodes: [{ name: "reel-node" }],
};

const DRACO = {
  asset: { version: "2.0" },
  extensionsUsed: ["KHR_draco_mesh_compression"],
  extensionsRequired: ["KHR_draco_mesh_compression"],
  meshes: [{ name: "spool" }, { name: "hub" }],
  materials: [{ name: "brass" }],
  nodes: [{}, {}],
  textures: [{ source: 0 }],
};

describe("inspectGltfFile", () => {
  it("describes a plain glTF binary", () => {
    const report = inspectGltfFile("reel.glb", buildGlb(SIMPLE));

    expect(report.ok).toBe(true);
    if (!report.ok) return;

    expect(report).toMatchObject({ meshes: 1, materials: 1, nodes: 1, compression: "none", version: 2 });
    expect(report.extensions).toEqual([]);
  });

  it("spots a DRACO-compressed model, so only then is the decoder fetched", () => {
    const report = inspectGltfFile("reel.glb", buildGlb(DRACO, 64));

    expect(report.ok).toBe(true);
    if (!report.ok) return;

    expect(report.compression).toBe("draco");
    expect(report.extensions).toContain("KHR_draco_mesh_compression");
    expect(report.textures).toBe(1);
  });

  it("spots a meshopt-compressed model", () => {
    const report = inspectGltfFile(
      "reel.glb",
      buildGlb({ ...SIMPLE, extensionsUsed: ["EXT_meshopt_compression"] }),
    );

    expect(report.ok && report.compression).toBe("meshopt");
  });

  it("refuses a .gltf, which would need external files", () => {
    const report = inspectGltfFile("reel.gltf", buildGlb(SIMPLE));

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain(".glb");
  });

  it("refuses a file that is not a glTF binary", () => {
    const report = inspectGltfFile("notes.glb", new TextEncoder().encode("hello there").buffer);

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain("glTF");
  });

  it("refuses an empty file", () => {
    const report = inspectGltfFile("empty.glb", new ArrayBuffer(0));

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toBe("That file is empty.");
  });

  it("refuses a model with nothing to draw", () => {
    const report = inspectGltfFile("empty-scene.glb", buildGlb({ asset: { version: "2.0" }, meshes: [] }));

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain("no meshes");
  });

  it("refuses an unsupported glTF version", () => {
    const buffer = buildGlb(SIMPLE);
    new DataView(buffer).setUint32(4, 1, true);

    const report = inspectGltfFile("old.glb", buffer);

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain("version 1");
  });

  it("refuses a file too big to parse without stalling the page", () => {
    const buffer = new ArrayBuffer(MAX_GLB_BYTES + 1);
    new DataView(buffer).setUint32(0, 0x46546c67, true);

    const report = inspectGltfFile("huge.glb", buffer);

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain("files up to 25.0 MB");
  });

  it("refuses a binary whose JSON chunk cannot be read", () => {
    const buffer = buildGlb(SIMPLE);
    new DataView(buffer).setUint32(12, 1_000_000, true);

    const report = inspectGltfFile("broken.glb", buffer);

    expect(report.ok).toBe(false);
    if (report.ok) return;
    expect(report.message).toContain("JSON");
  });
});

describe("compressionOf", () => {
  it("names every combination the loader understands", () => {
    expect(compressionOf([])).toBe("none");
    expect(compressionOf(["KHR_draco_mesh_compression"])).toBe("draco");
    expect(compressionOf(["EXT_meshopt_compression"])).toBe("meshopt");
    expect(compressionOf(["KHR_draco_mesh_compression", "EXT_meshopt_compression"])).toBe(
      "draco+meshopt",
    );
    expect(compressionOf(["KHR_texture_basisu"])).toBe("none");
  });
});

describe("reporting", () => {
  it("summarises a model in one line", () => {
    const inspection: GltfInspection = {
      ok: true,
      fileName: "reel.glb",
      bytes: 2048,
      version: 2,
      meshes: 2,
      materials: 1,
      nodes: 2,
      textures: 1,
      compression: "draco",
      extensions: ["KHR_draco_mesh_compression"],
    };

    expect(describeInspection(inspection)).toBe("2 meshes · 1 material · 2 KB · DRACO compressed · 1 texture");
  });

  it("formats sizes the way a person reads them", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});
