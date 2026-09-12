import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatefulSendButton, type SendButtonState } from "./StatefulSendButton";

/**
 * The send button announces its state through its accessible name, so these
 * tests survive any restyling of the motion layers.
 */

const LABELS: Record<SendButtonState, string> = {
  idle: "Send message",
  loading: "Sending message",
  success: "Message sent",
  error: "Send failed. Activate to retry.",
};

describe("StatefulSendButton", () => {
  it.each(Object.entries(LABELS))(
    "names itself for the %s state",
    (state, label) => {
      render(<StatefulSendButton state={state as SendButtonState} />);

      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    },
  );

  it("marks itself busy and unclickable while sending", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<StatefulSendButton state="loading" onClick={onClick} />);

    const button = screen.getByRole("button", { name: LABELS.loading });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("stays clickable while showing the sent confirmation", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<StatefulSendButton state="success" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: LABELS.success }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("honours a parent's disabled reason", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<StatefulSendButton state="idle" disabled onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: LABELS.idle }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it("submits a form when used as the form's button", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <StatefulSendButton state="idle" type="submit" />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: LABELS.idle }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
