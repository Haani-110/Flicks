import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { DropZone } from "./drop-zone";

function glbFile(name = "reel.glb") {
  return new File([new Uint8Array([0x67, 0x6c, 0x54, 0x46])], name, {
    type: "model/gltf-binary",
  });
}

describe("DropZone", () => {
  it("accepts a model picked with the file button", async () => {
    const onFiles = vi.fn();
    const user = userEvent.setup();

    renderWithProviders(
      <DropZone onFiles={onFiles}>
        <p>stage</p>
      </DropZone>,
    );

    await user.upload(screen.getByLabelText("Load a .glb file"), glbFile());

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0][0]).toBeInstanceOf(File);
    expect(onFiles.mock.calls[0][0][0].name).toBe("reel.glb");
  });

  it("accepts a model dropped onto the stage", () => {
    const onFiles = vi.fn();

    renderWithProviders(
      <DropZone onFiles={onFiles}>
        <p>stage</p>
      </DropZone>,
    );

    fireEvent.drop(screen.getByText("stage").parentElement as HTMLElement, {
      dataTransfer: { files: [glbFile("dropped.glb")] },
    });

    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(onFiles.mock.calls[0][0][0].name).toBe("dropped.glb");
  });

  it("only accepts what a glTF binary looks like", () => {
    renderWithProviders(
      <DropZone onFiles={vi.fn()}>
        <p>stage</p>
      </DropZone>,
    );

    expect(screen.getByLabelText("Load a .glb file")).toHaveAttribute(
      "accept",
      ".glb,model/gltf-binary",
    );
  });

  it("invites a drop while a file is hovering, and stops when it leaves", () => {
    renderWithProviders(
      <DropZone onFiles={vi.fn()} hint="Drop it here">
        <p>stage</p>
      </DropZone>,
    );

    const stage = screen.getByText("stage").parentElement as HTMLElement;
    fireEvent.dragEnter(stage);

    expect(screen.getByText("Drop it here")).toBeInTheDocument();

    fireEvent.dragLeave(stage, { relatedTarget: document.body });

    expect(screen.queryByText("Drop it here")).not.toBeInTheDocument();
  });

  it("keeps the stage usable while a file hovers over it", () => {
    renderWithProviders(
      <DropZone onFiles={vi.fn()}>
        <button type="button">Inside</button>
      </DropZone>,
    );

    const stage = screen.getByText("Inside").parentElement as HTMLElement;
    fireEvent.dragOver(stage);

    expect(screen.getByRole("button", { name: "Inside" })).toBeEnabled();
  });
});
