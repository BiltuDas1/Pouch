import Fuse from "fuse.js";
import { modules, type PouchModule } from "./loader";

const fuse = new Fuse<PouchModule>(modules, {
  keys: [
    { name: "title", weight: 3 },
    { name: "keywords", weight: 2 },
    { name: "description", weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

export function searchModules(query: string) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) return [];

  return fuse.search(normalizedQuery, { limit: 20 });
}
