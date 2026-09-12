import { useId, useState, type DragEvent, type ReactNode } from "react";

type DropZoneProps = {
  /** Receives the dropped or chosen files; the caller inspects and rejects. */
  onFiles: (files: File[]) => void;
  children: ReactNode;
  /** Text shown in the middle of the stage while a file is hovering over it. */
  hint?: string;
};

/**
 * Wraps the stage so a .glb can be dropped straight onto it.
 *
 * There is also a real file input behind a label, because drag-and-drop is not
 * available to keyboard or screen-reader users — the same action has to exist
 * as a button.
 */
export function DropZone({ onFiles, children, hint = "Drop a .glb to inspect it" }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  const accept = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  return (
    <div
      className="relative h-full w-full"
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer?.files ?? null);
      }}
    >
      {children}

      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-[#e8a73e] bg-[#0b0e10]/80">
          <p className="rounded-md bg-[#14181a] px-3 py-2 text-sm text-[#f3f1ec]">{hint}</p>
        </div>
      )}

      <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-md border border-[#2f3639] bg-black/45 px-2.5 py-1.5 text-xs text-[#e7e4dd] backdrop-blur transition-colors hover:border-[#e8a73e]"
        >
          Load a .glb file
        </label>
        <input
          id={inputId}
          type="file"
          accept=".glb,model/gltf-binary"
          className="sr-only"
          onChange={(event) => {
            accept(event.target.files);
            event.target.value = "";
          }}
        />
        <span className="hidden rounded bg-black/40 px-2 py-1 text-[11px] text-[#9aa1a6] sm:inline">
          or drop a model onto the stage
        </span>
      </div>
    </div>
  );
}
