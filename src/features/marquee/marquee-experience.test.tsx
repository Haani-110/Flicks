import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { movies } from "@/data/movies";
import { renderWithProviders } from "@/test/render";

/** The 3D module is replaced with something jsdom can render without a GPU. */
const viewport = vi.hoisted(() => ({ shouldThrow: false, capable: false }));

/** jsdom reports no WebGL; this switches the probe to a capable device. */
vi.mock("./quality", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./quality")>();
  return {
    ...actual,
    probeDevice: () =>
      viewport.capable
        ? { reducedMotion: false, webgl: true, deviceMemory: 8, hardwareConcurrency: 8, saveData: false }
        : actual.probeDevice(),
  };
});

vi.mock("./marquee-viewport", () => ({
  default: ({ active, config }: { active: boolean; config: { finish: string } }) => {
    if (viewport.shouldThrow) throw new Error("WebGL context lost");
    return (
      <p>
        Canvas mounted · {config.finish} · {active ? "rendering" : "idle"}
      </p>
    );
  },
}));

const { MarqueeExperience } = await import("./marquee-experience");

/** jsdom has no IntersectionObserver; this one answers immediately. */
function stubIntersection(isIntersecting: boolean) {
  class Stub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];

    constructor(private readonly callback: IntersectionObserverCallback) {}

    observe(target: Element) {
      this.callback(
        [{ target, isIntersecting, intersectionRatio: isIntersecting ? 1 : 0 } as IntersectionObserverEntry],
        this,
      );
    }
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal("IntersectionObserver", Stub);
}

/** A minimal but structurally valid glTF binary, enough for the inspector. */
function glbFile(name = "reel.glb") {
  const json = JSON.stringify({
    asset: { version: "2.0" },
    meshes: [{ name: "reel" }],
    materials: [{ name: "chrome" }],
    extensionsUsed: ["KHR_draco_mesh_compression"],
  });
  const jsonBytes = new TextEncoder().encode(json.padEnd(json.length + ((4 - (json.length % 4)) % 4), " "));
  const total = 12 + 8 + jsonBytes.length;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonBytes.length, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer).set(jsonBytes, 20);

  return new File([buffer], name, { type: "model/gltf-binary" });
}

async function startScene() {
  const user = userEvent.setup();
  stubIntersection(true);
  renderWithProviders(<MarqueeExperience />);

  await user.click(await screen.findByRole("button", { name: "Start the 3D scene anyway" }));
  await screen.findByText(/Canvas mounted/);

  return user;
}

beforeEach(() => {
  localStorage.clear();
  viewport.shouldThrow = false;
  viewport.capable = false;
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("MarqueeExperience", () => {
  it("shows the poster and says why when the device cannot run WebGL", async () => {
    stubIntersection(true);
    renderWithProviders(<MarqueeExperience />);

    expect(await screen.findByRole("img", { name: /Premiere marquee/ })).toBeInTheDocument();
    expect(screen.getByText(/cannot create a WebGL context/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start the 3D scene anyway" })).toBeInTheDocument();

    // Nothing heavy was fetched: the canvas has not mounted at all.
    expect(screen.queryByText(/Canvas mounted/)).not.toBeInTheDocument();
  });

  it("holds the scene back until the stage is near the viewport", async () => {
    viewport.capable = true;
    stubIntersection(false);
    renderWithProviders(<MarqueeExperience />);

    expect(await screen.findByRole("img", { name: /Premiere marquee/ })).toBeInTheDocument();
    expect(screen.getByText(/loads when this section reaches the viewport/)).toBeInTheDocument();

    // The chunk has not been requested and no context has been created.
    expect(screen.queryByText(/Canvas mounted/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause the scene" })).not.toBeInTheDocument();
  });

  it("mounts the scene on its own for a capable device that has it in view", async () => {
    viewport.capable = true;
    stubIntersection(true);
    renderWithProviders(<MarqueeExperience />);

    expect(await screen.findByText(/Canvas mounted/)).toBeInTheDocument();
    expect(screen.getByText("full quality")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start the 3D scene anyway" }),
    ).not.toBeInTheDocument();
  });

  it("starts the scene when the reader insists, even without WebGL", async () => {
    await startScene();

    expect(screen.queryByRole("img", { name: /Premiere marquee/ })).not.toBeInTheDocument();
  });

  it("hands the configurator's settings to the scene", async () => {
    const user = await startScene();

    expect(screen.getByText("Canvas mounted · chrome · rendering")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Copper" }));

    expect(screen.getByText("Canvas mounted · copper · rendering")).toBeInTheDocument();
  });

  it("can go back to the poster without a reload", async () => {
    const user = await startScene();

    await user.click(screen.getByRole("button", { name: "Use the static poster" }));

    expect(await screen.findByRole("img", { name: /Premiere marquee/ })).toBeInTheDocument();
    expect(screen.queryByText(/Canvas mounted/)).not.toBeInTheDocument();
  });

  it("parks the render loop when the reader pauses", async () => {
    const user = await startScene();

    await user.click(screen.getByRole("button", { name: "Pause the scene" }));

    expect(screen.getByText(/Scene paused/)).toBeInTheDocument();
    expect(screen.getByText("Canvas mounted · chrome · idle")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Resume the scene" }));

    expect(screen.getByText("Canvas mounted · chrome · rendering")).toBeInTheDocument();
  });

  it("features a movie from the panel: the board and the live region agree", async () => {
    const user = await startScene();
    const movie = movies[0];

    await user.click(screen.getByRole("button", { name: `Feature ${movie.title}` }));

    expect(screen.getByText(`Featured: ${movie.title} (${movie.year}).`)).toBeInTheDocument();
    expect(screen.getByLabelText("Sign text")).toHaveValue("DUNE");
  });

  it("explains a file that cannot be shown on the pedestal", async () => {
    await startScene();

    const stage = screen.getByText(/Canvas mounted/).parentElement as HTMLElement;
    fireEvent.drop(stage, {
      dataTransfer: { files: [new File(["{}"], "reel.gltf", { type: "model/gltf+json" })] },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Drop a binary glTF (.glb)");
  });

  it("rejects a .glb whose contents are not glTF at all", async () => {
    const user = await startScene();

    await user.upload(
      screen.getByLabelText("Load a .glb file"),
      new File(["definitely not a model"], "broken.glb", { type: "model/gltf-binary" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("does not look like a glTF binary");
  });

  it("puts a dropped glb on the pedestal and reports what it is", async () => {
    const user = await startScene();

    await user.upload(screen.getByLabelText("Load a .glb file"), glbFile());

    expect(await screen.findByText(/reel\.glb loaded — 1 mesh · 1 material · .* DRACO compressed/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back to the marquee’s own centerpiece" }));

    await waitFor(() => expect(screen.queryByText(/reel\.glb loaded/)).not.toBeInTheDocument());
  });

  it("falls back to the poster when the scene itself blows up", async () => {
    viewport.shouldThrow = true;
    stubIntersection(true);
    renderWithProviders(<MarqueeExperience />);

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Start the 3D scene anyway" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("stopped on this device");
    expect(screen.getByRole("img", { name: /Premiere marquee/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start the 3D scene" })).toBeInTheDocument();
  });
});
