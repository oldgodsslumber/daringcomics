# Tests

The app is a static page with no build step; these suites load `index.html` into
[jsdom](https://github.com/jsdom/jsdom) and drive the real functions.

```sh
npm install     # one dev dependency: jsdom
npm test        # all suites
node test/mp.js # one suite
```

| Suite       | Covers |
| ----------- | ------ |
| `wiki.js`   | Model-output parsing, name/alias upsert, universe scoping, cross-links, intake success and failure paths |
| `saves.js`  | Migration off the old 10 slots, save-index repair, quota failure, CRUD past 28 saves |
| `series.js` | Series tone/level on the universe, per-hero experience, the first-run gate |
| `mp.js`     | Two simulated clients: sync, collaboration, soft delete, and GM secret isolation |

## Notes on how these work

**Assertions run inside the page.** `w.eval(...)` rather than reaching in from
Node, because top-level `const`/`let` in `index.html` never land on `window`.

**`fakefb.js` is an in-memory Firebase with the security rules modelled.** It
exists so `mp.js` can prove a player never receives GM-only lore — a client-side
check alone would prove nothing. Two caveats:

- The rules are *modelled*, not evaluated by Firebase. Real RTDB rules
  **cascade**; the model is deliberately non-cascading, matching the per-subtree
  rules in `MULTIPLAYER.md`. If you change those rules, verify with the Rules
  Playground as well — this harness cannot catch a cascade mistake.
- Sign-in is stubbed. Nothing here exercises real Google auth.

**Timing.** The suites `await` fixed delays for debounced pushes to land. If a
suite goes flaky after a debounce interval changes, the waits are the thing to
adjust.

**Seed data must be realistic.** Several early failures were the harness's fault
for building characters without `aspects` or `stress`; `renderSheet` assumes
both, as everything that creates a character does. Use the `CHAR`/`CH` helpers
already in the suites rather than hand-rolling a partial character.
