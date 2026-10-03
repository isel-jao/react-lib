# @isel-jao/react-lib

A collection of small, general-purpose React hooks and components for everyday application code.

## Features

- **Zero dependencies** — nothing gets pulled into your bundle but this library itself. `react` and `react-dom` are peer dependencies, so you keep the copy you already have.
- **Tree-shakeable** — ships as ES modules with no side effects, so bundlers only include the parts you actually import.
- **Type-safe** — written in TypeScript with full type definitions included.
- Works in both ESM and CommonJS projects.

## Installation

```bash
npm install @isel-jao/react-lib
```

Requires React 18 or newer.

## Usage

Import only what you need — unused exports are automatically excluded from your final bundle.

```tsx
import { useBehaviorSubject } from "@isel-jao/react-lib";
```

## Modules

Every module ships its own reference doc covering why it exists, how it works internally, its full API, and its edge cases.

| Module | What it does | Main exports |
| --- | --- | --- |
| use-behavior-subject | Subscribes a component to a BehaviorSubject-style store and re-renders on each new value. | `useBehaviorSubject`, `SimpleBehaviorSubject` |

## Development

```bash
pnpm install        # install the toolchain
pnpm test           # run the test suite once
pnpm test:watch     # re-run tests on change
pnpm typecheck      # tsc --noEmit
pnpm check          # biome lint + format, applying fixes
pnpm build          # emit dist/ (ESM, CJS, and types)
```

A `pre-commit` hook runs the lint, typecheck and test steps before each commit.

### The build

There is no bundler. A zero-dependency library needs transpiling and declaration emit, which `tsc`
does on its own, so `typescript` is the only build dependency — nothing here can be abandoned
upstream.

`pnpm build` runs `scripts/build.mjs`, which clears `dist/`, compiles the sources twice, and writes
one small manifest into each output tree:

| Config | Output | Module system |
| --- | --- | --- |
| `tsconfig.build.esm.json` | `dist/esm/` | `nodenext` → ESM |
| `tsconfig.build.cjs.json` | `dist/cjs/` | `commonjs` |

Those generated `dist/esm/package.json` and `dist/cjs/package.json` files hold a single `"type"`
field each. They are what let Node read one tree as ESM and the other as CommonJS even though the
root manifest says `"type": "module"`; without them, `require()` of the CJS build fails.

Two consequences of compiling rather than bundling:

- **Relative imports need explicit `.js` extensions** (`./use-behavior-subject/index.js`), because `tsc` does
  not rewrite specifiers. The extension refers to the emitted file; TypeScript and Vite both map it
  back to the `.ts` source.
- **Output mirrors `src/`** rather than collapsing into one file, so tests and the vitest setup file
  are excluded in `tsconfig.build.json` to keep them out of `dist/`.

The package publishes `src/` alongside `dist/` (minus the tests). Both the sourcemaps and the
declaration maps reference the original `.ts` files, so shipping them is what makes a consumer's
go-to-definition land on real source instead of a `.d.ts` — and what keeps stack traces readable.

### Adding a module

One directory per module, named in kebab-case:

```
src/<module-name>/
  index.ts         # the implementation, with TSDoc on every export
  index.test.tsx   # its tests (.ts when no JSX is involved)
  README.md        # why it exists, how it works, API, usage, edge cases
```

Then re-export it from `src/index.ts` and add a row to the table above.
