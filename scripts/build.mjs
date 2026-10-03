import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

// Invoke tsc's JS entry through node rather than the .bin shim, so the build
// behaves the same on Windows as it does here.
const tsc = join(dirname(require.resolve("typescript/package.json")), "bin", "tsc");

function compile(project) {
  const { status, error } = spawnSync(process.execPath, [tsc, "-p", project], {
    stdio: "inherit",
  });
  if (error) throw error;
  if (status !== 0) process.exit(status ?? 1);
  console.log(`✓ ${project}`);
}

rmSync("dist", { recursive: true, force: true });

compile("tsconfig.build.esm.json");
compile("tsconfig.build.cjs.json");

// Each output tree declares its own module system. Without these, Node reads
// every .js under dist/cjs as ESM, because the root package.json says
// "type": "module" — and `require()` of the CJS build would fail.
for (const [dir, type] of [
  ["dist/esm", "module"],
  ["dist/cjs", "commonjs"],
]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), `${JSON.stringify({ type }, null, 2)}\n`);
  console.log(`✓ ${dir}/package.json ("type": "${type}")`);
}
