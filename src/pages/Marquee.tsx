import { MarqueeExperience } from "@/features/marquee/marquee-experience";

const NOTES = [
  {
    title: "Nothing to download",
    body: "The facade, bulbs, centerpiece and posters are built in code — no GLB, no HDR, no textures over the wire. The scene file is the only thing that loads.",
  },
  {
    title: "Lazy by default",
    body: "The canvas lives behind a dynamic import and only mounts when the stage scrolls into view on a device that can take it.",
  },
  {
    title: "Three tiers",
    body: "Full and lite differ in shadows, resolution and bulb detail. Reduced motion or a missing WebGL context gets the poster, which is drawn from your own settings.",
  },
];

export function Marquee() {
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-widest text-[#e8a73e]">Flicks</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#f3f1ec] sm:text-4xl">
          Premiere marquee
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#9aa1a6] sm:text-base">
          A 3D cinema facade you can dress: bring it up in chrome or gold, spell anything you like
          on the letter board, swap the centerpiece, and drop in your own <code>.glb</code> to
          inspect it on the pedestal. The film posters come from this app’s catalog.
        </p>
      </header>

      <MarqueeExperience />

      <section aria-labelledby="marquee-notes" className="border-t border-[#262b2f] pt-6">
        <h2 id="marquee-notes" className="text-lg font-semibold text-[#f3f1ec]">
          Under the hood
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {NOTES.map((note) => (
            <div key={note.title} className="rounded-lg border border-[#262b2f] bg-[#14181a] p-4">
              <h3 className="text-sm font-semibold text-[#f3f1ec]">{note.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#9aa1a6]">{note.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
