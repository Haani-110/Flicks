# Flicks

Flicks is a movie discovery application built with React, TypeScript, Vite, and an AI assistant powered by OpenRouter and the AI SDK.

## AI Movie Search Tool

The Flicks AI assistant includes a server-side tool called `search_movies`.

The tool allows the AI assistant to search the Flicks movie catalog using optional keywords, genres, and runtime limits.

### Tool name

`search_movies`

### Tool schema

The tool uses a typed Zod schema with the following parameters:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `query` | `string` | No | Keyword to search in movie titles or descriptions |
| `genre` | `string` | No | Movie genre such as Action, Drama, Comedy, Sci-Fi, Adventure, Crime, or History |
| `maxRuntime` | `number` | No | Maximum movie runtime in minutes |

Example tool input:

```json
{
  "query": "space",
  "genre": "Sci-Fi",
  "maxRuntime": 150
}

## Testing

The project ships a Vitest + React Testing Library suite for components, hooks and the AI route,
and a Playwright flow test that walks the primary journey in a real browser. Both run on every
push and a failing job blocks merging.

```bash
npm test              # unit + component tests
npm run test:coverage # with coverage thresholds
npm run test:e2e      # Playwright end-to-end flow
npm run verify        # typecheck + coverage + production build (what CI gates on)
```

See [docs/TESTING.md](docs/TESTING.md) for what is covered, how the AI route is mocked (no test
ever calls OpenRouter), the role/label query policy, and the CI evidence.
