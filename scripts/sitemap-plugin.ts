import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { globbySync } from "globby";
import { loadEnv, type Plugin } from "vite";

import {
  getModuleLastModified,
  getRootLastModified,
} from "./utils/file-metadata.js";
import { Sitemap, type SitemapEntry } from "./sitemap.js";

export function sitemapPlugin(): Plugin {
  let projectRoot = process.cwd();
  let srcDir = path.join(projectRoot, "src");
  let modulesDir = path.join(srcDir, "modules");
  let outputPath = path.join(projectRoot, "public", "sitemap.xml");
  let baseUrl: string | undefined;

  let sitemap: Sitemap | undefined;
  let knownModules = new Set<string>();
  let initialized = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let rebuildPending = false;
  let serverStopping = false;

  function isInside(parent: string, target: string): boolean {
    const relative = path.relative(parent, target);

    return (
      relative !== "" &&
      relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative)
    );
  }

  function collectEntries(): {
    entries: SitemapEntry[];
    moduleNames: Set<string>;
  } {
    if (!baseUrl) {
      throw new Error("Please set the SITE_URL environment variable.");
    }

    const moduleFiles = globbySync("*/main.tsx", {
      cwd: modulesDir,
      gitignore: true,
      onlyFiles: true,
    });

    const modules = moduleFiles.map((file) => {
      const name = path.dirname(file);
      const metadataPath = path.join(modulesDir, name, "package.json");
      const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));

      if (!metadata.title?.trim()) {
        throw new Error(
          `Module "${name}" must define a non-empty title in package.json`,
        );
      }

      return {
        name,
        lastmod: getModuleLastModified(modulesDir, name),
      };
    });

    const entries: SitemapEntry[] = [
      {
        url: `${baseUrl}/`,
        lastmod: getRootLastModified(srcDir),
      },
      ...modules.map(({ name, lastmod }) => ({
        url: `${baseUrl}/mod/${encodeURIComponent(name)}`,
        lastmod,
      })),
    ];

    return {
      entries,
      moduleNames: new Set(modules.map(({ name }) => name)),
    };
  }

  function initializeSitemap() {
    const result = collectEntries();

    if (!sitemap) {
      sitemap = new Sitemap(outputPath);
    }

    sitemap.initialize(result.entries);
    knownModules = result.moduleNames;
    initialized = true;

    console.log(
      `[sitemap] Generated sitemap with ${result.entries.length} URLs.`,
    );
  }

  function scheduleWrite() {
    if (serverStopping) return;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;

      try {
        if (rebuildPending || !sitemap) {
          initializeSitemap();
          rebuildPending = false;
          return;
        }

        sitemap.write();
        console.log("[sitemap] Sitemap updated.");
      } catch (error) {
        console.error("[sitemap] Update failed:", error);
      }
    }, 300);
  }

  function scheduleRebuild() {
    rebuildPending = true;
    scheduleWrite();
  }

  function updateChangedFile(file: string) {
    if (!initialized || !sitemap || !baseUrl || rebuildPending) {
      return;
    }

    const absolutePath = path.resolve(file);

    if (!isInside(srcDir, absolutePath)) {
      return;
    }

    let lastmod: string;

    try {
      lastmod = statSync(absolutePath).mtime.toISOString();
    } catch {
      // The file may have been deleted; the watcher handles rebuilding.
      return;
    }

    if (isInside(modulesDir, absolutePath)) {
      const relativeToModules = path.relative(modulesDir, absolutePath);
      const moduleName = relativeToModules.split(path.sep)[0];

      // Ignore files that don't belong to a discovered module.
      if (!moduleName || !knownModules.has(moduleName)) {
        return;
      }

      sitemap.update(
        `${baseUrl}/mod/${encodeURIComponent(moduleName)}`,
        lastmod,
      );
    } else {
      sitemap.update(`${baseUrl}/`, lastmod);
    }

    scheduleWrite();
  }

  return {
    name: "generate-sitemap",
    apply: "serve",

    configResolved(config) {
      projectRoot = config.root;
      srcDir = path.join(projectRoot, "src");
      modulesDir = path.join(srcDir, "modules");
      outputPath = path.join(projectRoot, "public", "sitemap.xml");

      const env = loadEnv(config.mode, projectRoot, "");
      baseUrl = env.SITE_URL?.replace(/\/+$/, "");

      if (!baseUrl) {
        throw new Error("Please set the SITE_URL environment variable.");
      }
    },

    buildStart() {
      if (initialized) return;

      initializeSitemap();
    },

    handleHotUpdate({ file }) {
      updateChangedFile(file);
    },

    configureServer(server) {
      const handleFileStructureChange = (file: string) => {
        const absolutePath = path.resolve(file);

        if (!isInside(srcDir, absolutePath)) {
          return;
        }

        // Additions and deletions can change discovery or timestamps.
        scheduleRebuild();
      };

      server.watcher.on("add", handleFileStructureChange);
      server.watcher.on("unlink", handleFileStructureChange);

      server.httpServer?.once("close", () => {
        serverStopping = true;

        if (debounceTimer) {
          clearTimeout(debounceTimer);
          debounceTimer = undefined;
        }

        server.watcher.off("add", handleFileStructureChange);
        server.watcher.off("unlink", handleFileStructureChange);
      });
    },
  };
}
