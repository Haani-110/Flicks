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
