import { expect, test } from "@playwright/test";
import {
  buildChatStreamSse,
  CHAT_ANSWER,
  CHAT_QUESTION,
  SEARCH_MATCHES,
  SEARCH_OUTPUT,
} from "../src/test/fixtures/chat-stream";

/**
 * The assistant's end-to-end path.
 *
 * `/api/chat` (a Vercel function that calls OpenRouter) is mocked with a
 * recorded stream fixture, and any attempt to reach the model provider aborts
 * the test — so this suite never calls a real API.
 */

const SSE_BODY = buildChatStreamSse();

test("a visitor gets a streamed answer with its catalog results", async ({
  page,
}) => {
  let posted: Record<string, unknown> | null = null;

  await page.route("**/api/chat", async (route) => {
    posted = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "x-vercel-ai-ui-message-stream": "v1",
      },
      body: SSE_BODY,
    });
  });

  // Nothing may talk to the provider directly.
  await page.route("**/openrouter.ai/**", (route) => route.abort());

  await page.goto("/assistant");

  await expect(
    page.getByRole("heading", { name: "Assistant" }),
  ).toBeVisible();

  // The page also hosts a button playground, so chat queries stay in the chat.
  const chat = page.getByRole("region", { name: "Assistant chat" });

  await chat.getByRole("textbox", { name: "Ask about movies" }).fill(CHAT_QUESTION);
  await chat.getByRole("button", { name: "Send message" }).click();

  await expect(
    chat.getByRole("article", { name: "Your message" }),
  ).toContainText(CHAT_QUESTION);

  const answer = chat.getByRole("article", { name: "Assistant message" });
  await expect(answer).toContainText(CHAT_ANSWER);
  await expect(answer).not.toHaveAttribute("aria-busy", "true");

  // The tool call and its results are rendered as parts, with catalog links.
  const toolCard = chat.getByRole("region", { name: "Catalog search" });
  await expect(toolCard).toBeVisible();
  await expect(
    toolCard.getByRole("list", { name: "Search results" }),
  ).toBeVisible();
  await expect(
    toolCard.getByRole("link", { name: SEARCH_MATCHES[0].title }),
  ).toHaveAttribute("href", `/movie/${SEARCH_MATCHES[0].id}`);

  // The request carried UI messages with parts, and used the mocked route only.
  expect(posted).not.toBeNull();
  const messages = (posted as unknown as { messages: { role: string; parts: { type: string; text?: string }[] }[] })
    .messages;
  expect(messages).toHaveLength(1);
  expect(messages[0].role).toBe("user");
  expect(messages[0].parts).toEqual([{ type: "text", text: CHAT_QUESTION }]);

  // The result count the tool reported is what the card shows.
  await expect(toolCard).toContainText(`${SEARCH_OUTPUT.count} results`);
});

test("a failing assistant route tells the reader what happened", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "AI is not configured." }),
    }),
  );

  await page.goto("/assistant");

  const chat = page.getByRole("region", { name: "Assistant chat" });

  await chat.getByRole("textbox", { name: "Ask about movies" }).fill(CHAT_QUESTION);
  await chat.getByRole("button", { name: "Send message" }).click();

  await expect(chat.getByRole("alert")).toHaveText("AI is not configured.");
  await expect(
    chat.getByRole("button", { name: "Send failed. Activate to retry." }),
  ).toBeVisible();
  await expect(
    chat.getByRole("textbox", { name: "Ask about movies" }),
  ).toBeEnabled();
});
