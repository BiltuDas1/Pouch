import { Search } from "lucide-react";
import GitHubIcon from "../svg/github";
import { modules } from "../utils/loader";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import packageJson from "../../package.json";
import CustomCursor from "../components/CustomCursor";
import SearchBox from "../components/SearchBox";
import AllModules from "../components/ListAllModules";

export default function Home() {
  const { moduleName } = useParams();
  const navigate = useNavigate();
  const [isSearchVisible, setSearchVisibilty] = useState<boolean>(false);

  const selectedModule =
    modules.find((module) => module.name === moduleName) ?? null;

  useEffect(() => {
    document.title = selectedModule
      ? `${selectedModule.title} | Pouch`
      : "Pouch";
  }, [selectedModule]);

  return (
    <>
      <title>
        {selectedModule ? `${selectedModule.title} | Pouch` : "Pouch"}
      </title>
      <meta
        name="description"
        content={
          selectedModule?.description ??
          "Explore free developer utilities in one place with Pouch"
        }
      />
      <CustomCursor />

      {isSearchVisible ? (
        <SearchBox setSearchBoxState={setSearchVisibilty} />
      ) : (
        <></>
      )}
      <main className="h-screen w-screen flex flex-row">
        <aside className="h-full w-fit min-w-max border-r-2 border-border-primary pl-5 pr-5 pt-4 pb-4 hidden md:flex flex-col gap-4 select-none">
          <section className="flex flex-col gap-4">
            <div className="flex flex-row justify-between items-center">
              <h1
                className="font-sans text-text-primary text-2xl font-bold hover:opacity-70"
                onClick={() => navigate("/")}
              >
                Pouch
              </h1>
              <p className="font-mono text-text-secondary text-sm">
                v{packageJson.version}
              </p>
            </div>
            <div
              className={`font-sans text-text-secondary bg-background-secondary px-2.5 w-full h-9 rounded-md flex flex-row items-center gap-2.5 border border-border-primary ${isSearchVisible ? "" : "hover:opacity-80"}`}
              onClick={() => setSearchVisibilty(true)}
            >
              <Search size={20} />
              <p className="text-sm">Search Anything</p>
            </div>
          </section>
          <section id="sidebar" className="w-full h-full flex flex-col gap-1">
            {modules.map((module) => (
              <button
                key={module.name}
                type="button"
                onClick={() => navigate(`/mod/${module.name}`)}
                className={`w-full whitespace-nowrap h-8 pr-2.5 pl-2.5 font-sans text-base text-text-menu rounded-md flex items-center outline-none focus:bg-menu-selection ${selectedModule?.name === module.name ? "bg-menu-selection" : "hover:bg-menu-selection"}`}
              >
                {module.title}
              </button>
            ))}
          </section>
        </aside>
        <section className="h-full w-full flex flex-col">
          <nav className="h-15 w-full border-b-2 border-border-primary flex flex-row items-center justify-between md:justify-end gap-2.5 px-3.5">
            <h1
              className="font-sans text-text-primary text-2xl font-bold hover:opacity-70 md:hidden"
              onClick={() => navigate("/")}
            >
              Pouch
            </h1>
            <div className="flex flex-row items-center justify-end gap-3">
              <GitHubIcon
                className="h-6.5 w-6.5 fill-white hover:opacity-80"
                onClick={() =>
                  window.open("https://github.com/BiltuDas1/Pouch", "_blank")
                }
              />
              <Search
                color="#ffffff"
                size={28}
                onClick={() => setSearchVisibilty(true)}
                className="hover:opacity-70 md:hidden"
              />
            </div>
          </nav>
          <section
            id="mainContainer"
            className="flex-1 min-h-0 overflow-auto p-4"
          >
            <div className="w-full h-8 text-2xl text-white font-bold text-center mb-4">
              <p>{selectedModule?.title ?? "All Tools"}</p>
            </div>

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
            ) : (
              <AllModules />
            )}
          </section>
        </section>
      </main>
    </>
  );
}
