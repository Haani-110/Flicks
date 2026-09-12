import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/render";
import { HealthCheck } from "./HealthCheck";

/** The health page is the app's only other network consumer. */

const TODO = {
  userId: 1,
  id: 1,
  title: "delectus aut autem",
  completed: false,
};

function mockHealthRoute(...replies: Response[]) {
  let calls = 0;
  const fetchMock = vi.fn(async () => {
    const reply = replies[Math.min(calls, replies.length - 1)];
    calls += 1;
    return reply;
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("HealthCheck page", () => {
  it("shows the fetched payload and an OK badge", async () => {
    const fetchMock = mockHealthRoute(jsonResponse(TODO));

    renderWithProviders(<HealthCheck />);

    expect(await screen.findByText(/delectus aut autem/)).toBeInTheDocument();
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a failing endpoint", async () => {
    mockHealthRoute(jsonResponse({ message: "boom" }, 503));

    renderWithProviders(<HealthCheck />);

    expect(await screen.findByText("Request failed")).toBeInTheDocument();
    expect(
      screen.getByText(/Request failed with status 503/),
    ).toBeInTheDocument();
    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("lets the reader retry the request", async () => {
    const user = userEvent.setup();
    const fetchMock = mockHealthRoute(
      jsonResponse({ message: "boom" }, 503),
      jsonResponse(TODO),
    );

    renderWithProviders(<HealthCheck />);

    await screen.findByText("Request failed");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(screen.getByText("OK")).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
