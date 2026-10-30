import { Check, Copy, Download } from "lucide-react";

interface KeyCardProps {
  title: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
}

export default function KeyCard({
  title,
  value,
  copied,
  onCopy,
  onDownload,
}: KeyCardProps) {
  return (
    <section className="w-full overflow-hidden rounded-lg border border-border-primary text-text-primary">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-primary bg-background-secondary px-4 py-3">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 text-sm hover:opacity-70"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 text-sm hover:opacity-70"
          >
            <Download size={15} />
            Download
          </button>
        </div>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all bg-background-secondary p-4 font-mono text-xs leading-6">
        {value}
      </pre>
    </section>
  );
}
