import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export interface SitemapEntry {
  url: string;
  lastmod: string | null;
}

export class Sitemap {
  private entries = new Map<string, SitemapEntry>();
  private outputPath: string;

  constructor(outputPath: string) {
    this.outputPath = outputPath;
  }

  initialize(entries: SitemapEntry[]) {
    this.entries.clear();

    for (const entry of entries) {
      this.entries.set(entry.url, entry);
    }

    this.write();
  }

  update(url: string, lastmod: string | null) {
    const entry = this.entries.get(url);

    if (!entry) return;

    entry.lastmod = lastmod;
    this.write();
  }

  add(entry: SitemapEntry) {
    this.entries.set(entry.url, entry);
  }

  remove(url: string) {
    return this.entries.delete(url);
  }

  write() {
    mkdirSync(path.dirname(this.outputPath), { recursive: true });
    writeFileSync(this.outputPath, this.toXml(), "utf8");
  }

  private toXml(): string {
    const urls = [...this.entries.values()]
      .map(({ url, lastmod }) => {
        const lastmodXml = lastmod
          ? `\n    <lastmod>${this.escapeXml(lastmod)}</lastmod>`
          : "";

        return `  <url>
    <loc>${this.escapeXml(url)}</loc>${lastmodXml}
  </url>`;
      })
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>
`;
  }

  private escapeXml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      };

      return entities[char];
    });
  }
}
