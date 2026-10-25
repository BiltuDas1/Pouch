import { Search } from "lucide-react";
import GitHubIcon from "../svg/github";
import { modules } from "../utils/loader";
import { Suspense } from "react";
import { useNavigate, useParams } from "react-router";
import packageJson from "../../package.json";

export default function Home() {
  const { moduleName } = useParams();
  const navigate = useNavigate();

  const selectedModule =
    modules.find((module) => module.name === moduleName) ?? null;

  return (
    <main className="h-screen w-screen flex flex-row">
      <aside className="h-full w-65 border-r-2 border-border-primary pl-5 pr-5 pt-4 pb-4 flex flex-col gap-4 select-none">
        <section className="flex flex-col gap-4">
          <div className="flex flex-row justify-between items-center">
            <h1 className="font-sans text-text-primary text-3xl font-bold">
              Pouch
            </h1>
            <p className="font-mono text-text-secondary text-xl">
              v{packageJson.version}
            </p>
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
              onClick={() => navigate(`/mod/${module.name}`)}
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
          {moduleName && !selectedModule ? (
            <p className="font-sans text-xl text-text-primary text-center">
              Module not found.
            </p>
          ) : selectedModule ? (
            <Suspense
              fallback={
                <p className="font-sans text-xl text-text-primary text-center">
                  Loading module...
                </p>
              }
            >
              <selectedModule.component />
            </Suspense>
          ) : null}
        </section>
      </section>
    </main>
  );
}
