import { useMemo, useState } from "react";
import { TrashIcon } from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";

export default function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(
    () => ({
      words: text.trim() ? text.trim().split(/\s+/u).length : 0,
      spaces: (text.match(/ /g) ?? []).length,
      characters: text.length,
    }),
    [text],
  );

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto w-full max-w-3xl space-y-5">
        <div className="rounded-2xl border border-border-primary bg-background-secondary p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                Text statistics
              </h2>
              <p className="mt-1 text-sm text-text-secondary">
                Type or paste text to count words, spaces, and characters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setText("");
              }}
              className="flex items-center gap-2 rounded-md border border-border-primary px-3 py-2 text-sm text-text-primary hover:bg-dark"
            >
              <TrashIcon size={15} />
              Clear
            </button>
          </div>
          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-medium text-text-primary">
              Your text
            </span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
              }}
              placeholder="Start typing or paste your text here…"
              rows={10}
              spellCheck={false}
              className="w-full resize-y rounded-lg border border-border-primary bg-dark p-3 text-sm leading-6 text-text-primary outline-none placeholder:text-text-secondary focus:border-text-secondary"
            />
          </label>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { label: "Words", value: stats.words },
              { label: "Spaces", value: stats.spaces },
              { label: "Total characters", value: stats.characters },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border-primary bg-dark p-4"
              >
                <p className="text-sm text-text-secondary">{stat.label}</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums text-text-primary">
                  {stat.value.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <p className="text-xs text-text-secondary">
              Spaces counts ordinary space characters. Total characters includes
              spaces, punctuation, and line breaks.
            </p>
          </div>
        </div>
      </section>
    </ShadowModule>
  );
}
