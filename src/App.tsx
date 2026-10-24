import { Search } from "lucide-react";
import GitHubIcon from "./svg/github";
import { modules } from "./utils/loader";
import { useState } from "react";
import { Suspense } from "react";

export default function App() {
  const [selectedModule, setSelectedModule] = useState<
    (typeof modules)[number] | null
  >(null);

  return (
    <main className="h-screen w-screen flex flex-row">
      <aside className="h-full w-65 border-r-2 border-border-primary pl-5 pr-5 pt-4 pb-4 flex flex-col gap-4 select-none">
        <section className="flex flex-col gap-4">
          <div className="flex flex-row justify-between items-center">
            <h1 className="font-sans text-text-primary text-3xl font-bold">
              Pouch
            </h1>
            <p className="font-mono text-text-secondary text-xl">v1.0</p>
          </div>
          <div className="font-sans text-text-secondary bg-background-secondary pl-2.5 pr-2.5 w-full h-10.5 rounded-md flex flex-row items-center gap-2.5 border border-border-primary">
            <Search size={20} />
            <p className="text-sm">Search Anything</p>
          </div>
        </section>
        <section id="sidebar" className="w-full h-full flex flex-col">
          {modules.map((module) => (
            <button
              key={module.name}
              type="button"
              onClick={() => setSelectedModule(module)}
              className={`w-full h-10 pr-2.5 pl-2.5 font-sans text-xl text-text-menu rounded-md flex items-center cursor-pointer ${selectedModule?.name === module.name ? "bg-menu-selection" : "hover:bg-menu-selection"}`}
            >
              {module.title}
            </button>
          ))}
        </section>
      </aside>
      <section className="h-full w-full flex flex-col">
        <nav className="h-15 w-full border-b-2 border-border-primary flex flex-row items-center justify-end gap-2.5 pr-3.5 pl-3.5">
          <GitHubIcon className="h-6.5 w-6.5 fill-white" />
        </nav>
        <section
          id="mainContainer"
          className="flex-1 min-h-0 overflow-auto p-4"
        >
          {selectedModule ? (
            <Suspense fallback={<p>Loading module...</p>}>
              <selectedModule.component />
            </Suspense>
          ) : (
            <></>
          )}
        </section>
      </section>
    </main>
  );
}
