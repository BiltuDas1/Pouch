import { readFileSync } from "node:fs";
import path from "node:path";
import { globbySync } from "globby";
import {
  getModuleLastModified,
  getRootLastModified,
} from "./utils/file-metadata.js";
import { Sitemap, type SitemapEntry } from "./sitemap.ts";

const baseUrl = process.env.SITE_URL?.replace(/\/+$/, "");

if (!baseUrl) {
  throw new Error("Please set the SITE_URL environment variable.");
}

const projectRoot = process.cwd();
const srcDir = path.join(projectRoot, "src");
const modulesDir = path.join(srcDir, "modules");
const publicDir = path.join(projectRoot, "public");
const outputPath = path.join(publicDir, "sitemap.xml");

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

const sitemap = new Sitemap(outputPath);

sitemap.initialize(entries);

console.log(`Generated sitemap with ${entries.length} URLs.`);
