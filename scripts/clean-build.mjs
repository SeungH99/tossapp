import { rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const workspaceRoot = resolve(process.cwd());
const buildDirectory = resolve(workspaceRoot, "dist");

if (dirname(buildDirectory) !== workspaceRoot) {
  throw new Error("Refusing to clean a build directory outside the project");
}

await rm(buildDirectory, { force: true, recursive: true });
