import { ChevronsUpDownIcon, Search } from "lucide-react";

type SearchBoxProps = {
  setSearchBoxState: (value: boolean) => void;
};

export default function SearchBox({ setSearchBoxState }: SearchBoxProps) {
  return (
    <section
      className="fixed w-screen h-screen bg-search-blur-background/70 flex flex-row justify-center"
      onClick={() => setSearchBoxState(false)}
    >
      <div
        className="absolute top-[10vh] h-fit w-142 flex flex-col bg-background-primary rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-16 px-2.5 text-text-secondary flex flex-row items-center gap-2.5">
          <Search size={26} />
          <input
            placeholder="Start typing..."
            className="outline-none text-xl"
            autoFocus
          />
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
