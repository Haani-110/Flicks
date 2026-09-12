# Flicks — Capstone Reflection

## What was hardest, and why?

The hardest part of Flicks was taking the application beyond a working frontend and making the different pieces behave reliably together. Adding features was relatively straightforward compared with handling the edge cases around them. The AI assistant required server-side request handling, validation, rate limiting, timeouts, streaming responses, and safe handling of failures. The application also needed to remain usable when the AI service was unavailable. At the same time, adding the 3D marquee introduced performance and accessibility concerns, so I had to make decisions about lazy loading, reduced motion, device capabilities, and fallbacks instead of assuming every device could handle the same experience.

## What would you do differently next time?

I would establish the production constraints earlier instead of adding some of them later in the development process. In particular, I would define the accessibility, testing, performance, and deployment requirements at the beginning and use them as acceptance criteria for every feature. I would also keep the scope smaller if the goal were purely to demonstrate an AI-enhanced frontend. The final Flicks application contains more functionality than the minimum required for the capstone, so a more tightly scoped version could have reached the same learning goals with less implementation complexity.

## One thing I learned that surprised me

One thing that surprised me was how much of production frontend development happens outside the visible UI. A feature can look finished while still having problems with error states, keyboard interaction, loading behaviour, API failures, performance, testing, or deployment configuration. Working through these issues changed how I think about completing a project. I learned that shipping a feature is not just making it work in the happy path; it also means making the behaviour predictable when things go wrong and leaving enough documentation that another developer can understand and maintain it.
