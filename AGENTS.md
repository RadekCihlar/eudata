# Agent rules for this repo

Anyone (human or AI) working on this codebase MUST follow these.

## Explorer policy

`packages/web/` is **local-dev only**. It exists on disk for hands-on testing of the library modules but is **not** part of the shipped library.

Hard rules:

1. **Never commit `packages/web/` to git.** It is in `.gitignore`. Do not add it back, do not `git add -f`, do not edit `.gitignore` to allow it.
2. **Never mention the explorer in `README.md`** or in any other published doc. No "run the explorer" sections, no screenshots, no install hints. The library stands on its own.
3. New modules you add to the library — yes, wire them into the explorer locally (`packages/web/lib/modules.ts` + `dispatch.ts`) so they can be tested. Just don't commit that wiring.
4. The explorer can be rebuilt from scratch any time. Treat it as scratch space, not a deliverable.

## Other notes

- Country packages (`czechdata`, `slovakdata`, `polishdata`, `eudata`, `eudata-common`) are the shipped surface. Keep their docs, examples, and APIs clean and human-readable.
- Tests live next to source under `tests/`. Mocked unit only; integration tests are out of scope.
- See `README.md` for what the library provides and how to use it.
