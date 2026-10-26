import { ChevronsUpDownIcon, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bars, Oval } from "react-loader-spinner";
import { searchModules } from "../utils/search";
import { useNavigate } from "react-router";

type SearchBoxProps = {
  setSearchBoxState: (value: boolean) => void;
};

export default function SearchBox({ setSearchBoxState }: SearchBoxProps) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [destination, setDestination] = useState<string | null>(null);

  function closeSearchBox() {
    if (!closing) setClosing(true);
  }

  // Debouncing for 2 second
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (inputValue.length > 0) {
        setQuery(inputValue);
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [inputValue]);

  // Search on anything changes
  const results = useMemo(() => {
    return searchModules(query);
  }, [searchModules, query]);

  // Disable loading spinner
  useEffect(() => {
    setSearching(false);
  }, [results]);

  return (
    <section
      className={`fixed w-screen h-screen ${closing ? "overlay-exit" : "overlay-enter"} flex flex-row justify-center`}
      onClick={closeSearchBox}
      onAnimationEnd={(e) => {
        if (closing && e.target === e.currentTarget) {
          setSearchBoxState(false);
        }

        if (destination) {
          navigate(destination);
        }
      }}
    >
      <div
        className={`absolute top-[10vh] h-fit w-142 flex flex-col bg-background-primary rounded-lg ${closing ? "search-box-exit" : "search-box-enter"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-16 px-2.5 text-text-secondary flex flex-row items-center gap-2.5">
          <div className="relative size-6.5">
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                searching ? "opacity-0" : "opacity-100"
              }`}
            >
              <Search size={26} />
            </div>

            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                searching ? "opacity-100" : "opacity-0"
              }`}
            >
              <Oval
                height={22}
                width={22}
                color="var(--color-text-secondary)"
                secondaryColor="var(--color-text-secondary)"
                strokeWidth={4}
              />
            </div>
          </div>

          <input
            placeholder="Start typing..."
            className="outline-none text-xl w-full text-text-primary"
            value={inputValue}
            autoFocus
            onChange={(e) => {
              setInputValue(e.target.value);
              setSearching(e.target.value.length > 0);
            }}
          />
        </div>
        <div
          className={`w-full h-fit border-t-2 border-border-primary ${!(searching || results.length > 0) && "hidden"} flex flex-col justify-center py-2`}
        >
          <div
            className={`w-full flex flex-row justify-center px-4 ${!(searching && results.length == 0) && "hidden"}`}
          >
            <Bars height={30} width={30} color="var(--color-text-primary)" />
          </div>
          <div className="flex flex-col max-h-80 overflow-y-auto px-4 py-2 custom-scrollbar text-text-menu gap-2.5">
            {results.map(({ item }) => (
              <button
                key={item.name}
                className="w-full h-fit hover:bg-background-secondary hover:outline outline-border-primary focus:bg-background-secondary focus:outline rounded-md px-2 py-1 flex flex-col items-start"
                onClick={() => {
                  setDestination(`/mod/${item.name}`);
                  closeSearchBox();
                }}
              >
                <h3 className="text-lg">{item.title}</h3>
                <p className="text-sm">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-10 bg-search-background-secondary rounded-b-lg flex flex-row items-center px-2.5">
          <div className="flex flex-row gap-1 items-center">
            <ChevronsUpDownIcon size={16} />
            <p className="font-sans text-black">Navigate</p>
          </div>
        </div>
      </div>
    </section>
  );
}
