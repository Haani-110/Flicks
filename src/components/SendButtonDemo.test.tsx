import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { SendButtonDemo } from "./SendButtonDemo";

/**
 * The button playground on `/assistant`.
 *
 * It is a demo, but it is a *shipped* demo with a 20% simulated failure rate,
 * so its state machine is worth pinning down: each outcome must reach the right
 * label, the controls must lock while a send is in flight, the attempt counter
 * must be announced, and the compact button must stay independent of the
 * primary one.
 *
 * The simulated send is a real 900–1800 ms timer. Fake timers and
 * `user-event`'s own internal scheduling do not mix, so the waits here are real
 * and each assertion uses RTL's async queries. `Math.random` is pinned to make
 * the "random" branch deterministic.
 */

const WAIT = { timeout: 4_000 };

const playground = () => screen.getByRole("region", { name: "Send button playground" });

describe("SendButtonDemo", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup({ delay: null });
    renderWithProviders(<SendButtonDemo />);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("introduces itself as a simulation, separate from the real chat", () => {
    expect(
      within(playground()).getByRole("heading", { name: "Send button playground" }),
    ).toBeInTheDocument();
    expect(within(playground()).getByText("Demo only")).toBeInTheDocument();
    expect(
      within(playground()).getByText(/the real chat above is unaffected/i),
    ).toBeInTheDocument();
    expect(within(playground()).getByText("No simulated sends yet.")).toBeInTheDocument();
  });

  it("runs a forced success and then returns to idle", async () => {
    await user.click(within(playground()).getByRole("button", { name: "Force Success" }));

    expect(
      await within(playground()).findByRole("button", { name: "Simulated send succeeded" }, WAIT),
    ).toBeInTheDocument();
    expect(within(playground()).getByText(/Attempts: 1/)).toBeInTheDocument();
    expect(
      within(playground()).getByText(/Forced success — deterministic\./),
    ).toBeInTheDocument();

    // The confirmation is a flash, not a permanent state.
    expect(
      await within(playground()).findByRole("button", { name: "Run a simulated send" }, WAIT),
    ).toBeEnabled();
  });

  it("runs a forced failure and offers a retry", async () => {
    await user.click(within(playground()).getByRole("button", { name: "Force Error" }));

    expect(
      await within(playground()).findByRole(
        "button",
        { name: "Simulated send failed. Activate to retry." },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
    expect(
      within(playground()).getByText(/Forced error — deterministic\. Press Retry\./),
    ).toBeInTheDocument();
  });

  it("locks both forced controls while a send is in flight", async () => {
    await user.click(within(playground()).getByRole("button", { name: "Force Error" }));

    // The primary button is the one that reports the in-flight state.
    await within(playground()).findByRole("button", { name: "Simulated send in flight" });

    expect(
      within(playground()).getByRole("button", { name: "Force Success" }),
    ).toBeDisabled();
    expect(
      within(playground()).getByRole("button", { name: "Force Error" }),
    ).toBeDisabled();
  });

  it("takes the random path's success branch", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    await user.click(
      within(playground()).getByRole("button", { name: "Run a simulated send" }),
    );

    expect(
      await within(playground()).findByRole("button", { name: "Simulated send succeeded" }, WAIT),
    ).toBeInTheDocument();
    expect(
      within(playground()).getByText(/Simulated send succeeded\./),
    ).toBeInTheDocument();
  });

  it("takes the random path's 20% failure branch", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);

    await user.click(
      within(playground()).getByRole("button", { name: "Run a simulated send" }),
    );

    expect(
      await within(playground()).findByRole(
        "button",
        { name: "Simulated send failed. Activate to retry." },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
    expect(
      within(playground()).getByText(/Simulated send failed \(20% path\)\. Press Retry\./),
    ).toBeInTheDocument();
  });

  it("counts every attempt, including the ones that failed", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);

    await user.click(
      within(playground()).getByRole("button", { name: "Run a simulated send" }),
    );
    await within(playground()).findByRole(
      "button",
      { name: "Simulated send failed. Activate to retry." },
      WAIT,
    );

    // The error state is itself the retry affordance.
    await user.click(
      within(playground()).getByRole("button", {
        name: "Simulated send failed. Activate to retry.",
      }),
    );

    // Two simulated sends of 900–1800 ms each, so this one needs more room.
    expect(
      await within(playground()).findByText(/Attempts: 2/, undefined, { timeout: 8_000 }),
    ).toBeInTheDocument();
  });

  it("drives the compact button independently of the primary one", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);

    await user.click(within(playground()).getByRole("button", { name: "Run the compact simulated action" }));

    expect(
      await within(playground()).findByRole("button", { name: "Compact action in flight" }, WAIT),
    ).toBeInTheDocument();
    // The primary button never changed state.
    expect(
      within(playground()).getByRole("button", { name: "Run a simulated send" }),
    ).toBeEnabled();

    expect(
      await within(playground()).findByRole("button", { name: "Compact action finished" }, WAIT),
    ).toBeInTheDocument();

    expect(
      await within(playground()).findByRole("button", { name: "Run the compact simulated action" }, WAIT),
    ).toBeInTheDocument();
  });

  it("gives its two buttons distinct accessible names", () => {
    // Both used to announce themselves as "Send message" — a screen-reader
    // user could not tell the simulated send from the compact action.
    const region = playground();
    const names = within(region)
      .getAllByRole("button")
      .map((button) => button.getAttribute("aria-label") ?? button.textContent);

    expect(names).toContain("Run a simulated send");
    expect(names).toContain("Run the compact simulated action");
    expect(new Set(names).size).toBe(names.length);
  });

  it("takes the compact button's failure branch without touching the primary", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.01);

    await user.click(
      within(playground()).getByRole("button", {
        name: "Run the compact simulated action",
      }),
    );

    expect(
      await within(playground()).findByRole(
        "button",
        { name: "Compact action failed. Activate to retry." },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
    // The two demos never share state.
    expect(
      within(playground()).getByRole("button", { name: "Run a simulated send" }),
    ).toBeEnabled();
    expect(within(playground()).getByText("No simulated sends yet.")).toBeInTheDocument();
  });

  it("recovers the compact button from its failure state", async () => {
    const random = vi.spyOn(Math, "random");

    random.mockReturnValue(0.01);
    await user.click(
      within(playground()).getByRole("button", {
        name: "Run the compact simulated action",
      }),
    );
    await within(playground()).findByRole(
      "button",
      { name: "Compact action failed. Activate to retry." },
      { timeout: 4_000 },
    );

    random.mockReturnValue(0.99);
    await user.click(
      within(playground()).getByRole("button", {
        name: "Compact action failed. Activate to retry.",
      }),
    );

    expect(
      await within(playground()).findByRole(
        "button",
        { name: "Compact action finished" },
        { timeout: 4_000 },
      ),
    ).toBeInTheDocument();
  });

  it("clears its pending timers when it unmounts mid-animation", async () => {
    // beforeEach already rendered one; this test needs the unmount handle.
    cleanup();
    const { unmount } = renderWithProviders(<SendButtonDemo />);

    // Leave the compact demo in the middle of its success flash, so an unmount
    // has a live timer to cancel.
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    await user.click(
      within(playground()).getByRole("button", {
        name: "Run the compact simulated action",
      }),
    );
    await within(playground()).findByRole(
      "button",
      { name: "Compact action finished" },
      { timeout: 4_000 },
    );

    expect(() => unmount()).not.toThrow();
    expect(screen.queryByRole("region", { name: "Send button playground" })).toBeNull();
  });

  it("explains the motion system it is demonstrating", () => {
    expect(
      within(playground()).getByRole("heading", { name: "Motion decisions" }),
    ).toBeInTheDocument();
    expect(within(playground()).getByText(/prefers-reduced-motion/)).toBeInTheDocument();
  });
});
