import { createPackedContentCatalog, type PackModuleRegistry } from "./content-catalog";
import manifest from "./manifest.json";
import type { ContentManifest } from "./types";

function toManifestPath(path: string): string {
  return `src/content/${path.slice(2)}`;
}

export function createViteContentCatalog() {
  const importers: PackModuleRegistry = {};
  const modules = {
    ...import.meta.glob("./core/*.json"),
    ...import.meta.glob("./bonus/*/*.json"),
  };

  for (const [path, importer] of Object.entries(modules)) {
    importers[toManifestPath(path)] = importer;
  }

  return createPackedContentCatalog(manifest as ContentManifest, importers);
}
