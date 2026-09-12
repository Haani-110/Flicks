/**
 * Reads a dropped .glb far enough to answer three questions before any of it
 * reaches the GPU: is this a usable model, how big is it, and does it need a
 * decompression decoder (DRACO / meshopt)?
 *
 * Parsing the header ourselves means the drop zone can give a real error
 * message, and the decoders are only imported for files that actually use them.
 */

const GLB_MAGIC = 0x46546c67; // "glTF", little-endian
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const DRACO_EXTENSION = "KHR_draco_mesh_compression";
const MESHOPT_EXTENSION = "EXT_meshopt_compression";

/** Files above this are refused: parsing one would stall the main thread. */
export const MAX_GLB_BYTES = 25 * 1024 * 1024;

export type CompressionKind = "none" | "draco" | "meshopt" | "draco+meshopt";

export type GltfInspection = {
  ok: true;
  fileName: string;
  bytes: number;
  version: number;
  meshes: number;
  materials: number;
  nodes: number;
  textures: number;
  compression: CompressionKind;
  /** Extensions the file asks for, reported verbatim. */
  extensions: string[];
};

export type GltfProblem = {
  ok: false;
  fileName: string;
  bytes: number;
  message: string;
};

export type GltfReport = GltfInspection | GltfProblem;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function problem(fileName: string, bytes: number, message: string): GltfProblem {
  return { ok: false, fileName, bytes, message };
}

export function inspectGltfFile(fileName: string, buffer: ArrayBuffer): GltfReport {
  const bytes = buffer.byteLength;

  if (!fileName.toLowerCase().endsWith(".glb")) {
    return problem(
      fileName,
      bytes,
      "Drop a binary glTF (.glb). A .gltf file points at external textures and buffers, which this page cannot fetch.",
    );
  }

  if (bytes === 0) {
    return problem(fileName, bytes, "That file is empty.");
  }

  if (bytes > MAX_GLB_BYTES) {
    return problem(
      fileName,
      bytes,
      `That model is ${formatBytes(bytes)}; the drop zone takes files up to ${formatBytes(MAX_GLB_BYTES)}.`,
    );
  }

  if (bytes < 20) {
    return problem(fileName, bytes, "That file is too short to be a glTF binary.");
  }

  const view = new DataView(buffer);

  if (view.getUint32(0, true) !== GLB_MAGIC) {
    return problem(fileName, bytes, "That does not look like a glTF binary (missing the “glTF” header).");
  }

  const version = view.getUint32(4, true);
  if (version !== 2) {
    return problem(fileName, bytes, `Unsupported glTF version ${version}; this viewer understands version 2.`);
  }

  const json = readJsonChunk(view);
  if (!json) {
    return problem(fileName, bytes, "The file's JSON chunk could not be read, so the model cannot be described.");
  }

  const meshes = count(json.meshes);
  if (meshes === 0) {
    return problem(fileName, bytes, "That model contains no meshes to display.");
  }

  const extensions = Array.isArray(json.extensionsUsed)
    ? json.extensionsUsed.filter((name): name is string => typeof name === "string")
    : [];

  return {
    ok: true,
    fileName,
    bytes,
    version,
    meshes,
    materials: count(json.materials),
    nodes: count(json.nodes),
    textures: count(json.textures),
    compression: compressionOf(extensions),
    extensions,
  };
}

function readJsonChunk(view: DataView): Record<string, unknown> | undefined {
  let offset = 12;
  const total = view.byteLength;

  while (offset + 8 <= total) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const start = offset + 8;

    if (start + length > total) return undefined;
    if (type === CHUNK_JSON) {
      try {
        const text = new TextDecoder().decode(new Uint8Array(view.buffer, view.byteOffset + start, length));
        const parsed: unknown = JSON.parse(text);
        return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
      } catch {
        return undefined;
      }
    }

    offset = start + length;
  }

  return undefined;
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function compressionOf(extensions: readonly string[]): CompressionKind {
  const draco = extensions.includes(DRACO_EXTENSION);
  const meshopt = extensions.includes(MESHOPT_EXTENSION);

  if (draco && meshopt) return "draco+meshopt";
  if (draco) return "draco";
  if (meshopt) return "meshopt";
  return "none";
}

/** One line for the UI: what the file is and what it will cost to decode. */
export function describeInspection(report: GltfInspection): string {
  const parts = [
    `${report.meshes} mesh${report.meshes === 1 ? "" : "es"}`,
    `${report.materials} material${report.materials === 1 ? "" : "s"}`,
    formatBytes(report.bytes),
  ];

  if (report.compression === "draco") parts.push("DRACO compressed");
  if (report.compression === "meshopt") parts.push("meshopt compressed");
  if (report.compression === "draco+meshopt") parts.push("DRACO + meshopt compressed");
  if (report.textures > 0) parts.push(`${report.textures} texture${report.textures === 1 ? "" : "s"}`);

  return parts.join(" · ");
}
