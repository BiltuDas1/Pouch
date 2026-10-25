import { statSync } from "node:fs";
import path from "node:path";
import { globbySync } from "globby";

function getLatestModified(
  directory: string,
  ignore: string[] = [],
): string | null {
  const files = globbySync("**/*", {
    cwd: directory,
    gitignore: true,
    onlyFiles: true,
    dot: true,
    ignore,
  });

  let latest = 0;

  for (const file of files) {
    const modified = statSync(path.join(directory, file)).mtimeMs;

    if (modified > latest) {
      latest = modified;
    }
  }

  return latest > 0 ? new Date(latest).toISOString() : null;
}

export function getModuleLastModified(
  modulesDir: string,
  moduleName: string,
): string | null {
  return getLatestModified(path.join(modulesDir, moduleName));
}

export function getRootLastModified(srcDir: string): string | null {
  return getLatestModified(srcDir, ["modules/**"]);
}
