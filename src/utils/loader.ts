import { lazy, type ComponentType, type LazyExoticComponent } from "react";

interface ModuleMetadata {
  title: string;
  description?: string | null;
  keywords?: string[] | null;
}

export interface PouchModule extends ModuleMetadata {
  name: string;
  component: LazyExoticComponent<ComponentType>;
}

const discoveredComponents = import.meta.glob<{
  default: ComponentType;
}>("../modules/*/main.tsx");

const discoveredMetadata = import.meta.glob<ModuleMetadata>(
  "../modules/*/package.json",
  {
    eager: true,
    import: "default",
  },
);

export const modules: PouchModule[] = Object.entries(discoveredComponents).map(
  ([path, loader]) => {
    const match = path.match(/^\.\.\/modules\/([^/]+)\/main\.tsx$/);

    if (!match) {
      throw new Error(`Invalid module path: ${path}`);
    }

    const name = match[1];
    const metadataPath = `../modules/${name}/package.json`;
    const metadata = discoveredMetadata[metadataPath];

    if (!metadata?.title?.trim()) {
      throw new Error(
        `Module "${name}" must define a non-empty title in package.json`,
      );
    }

    return {
      name,
      title: metadata.title,
      description: metadata.description ?? null,
      keywords: metadata.keywords ?? null,
      component: lazy(loader),
    };
  },
);
