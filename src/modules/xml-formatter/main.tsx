import { useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Clipboard,
  Code2,
  Copy,
  Expand,
  FileCode2,
  Minimize2,
  RotateCcw,
} from "lucide-react";
import ShadowModule from "../../components/ShadowModule";
import styles from "./main.css?inline";
import {
  collectExpandablePaths,
  formatXml,
  getXmlTree,
  parseXml,
  type XmlNodeData,
} from "./lib/xml";

type XmlNodeProps = {
  node: XmlNodeData;
  depth: number;
  collapsed: Set<string>;
  onToggle: (path: string) => void;
};

function XmlNode({ node, depth, collapsed, onToggle }: XmlNodeProps) {
  const hasChildren = node.children.length > 0;
  const expanded = !collapsed.has(node.id);
  const padding = { paddingLeft: `${depth * 16}px` };

  if (node.type === "text") {
    if (!node.value.trim()) return null;
    return (
      <div className="xml-line" style={padding}>
        <span className="xml-text">{node.value}</span>
      </div>
    );
  }
  if (node.type === "comment") {
    return (
      <div className="xml-line" style={padding}>
        <span className="xml-comment">&lt;!--{node.value}--&gt;</span>
      </div>
    );
  }
  if (node.type === "cdata") {
    return (
      <div className="xml-line" style={padding}>
        <span className="xml-cdata">&lt;![CDATA[{node.value}]]&gt;</span>
      </div>
    );
  }
  if (node.type === "processing") {
    return (
      <div className="xml-line" style={padding}>
        <span className="xml-punctuation">&lt;?</span>
        <span className="xml-tag">{node.name}</span>
        {node.value && (
          <span className="xml-attribute-value"> {node.value}</span>
        )}
        <span className="xml-punctuation">?&gt;</span>
      </div>
    );
  }
  if (node.type === "doctype") {
    return (
      <div className="xml-line" style={padding}>
        <span className="xml-comment">&lt;!DOCTYPE {node.name}&gt;</span>
      </div>
    );
  }

  return (
    <div>
      <div className="xml-line" style={padding}>
        {hasChildren ? (
          <button
            type="button"
            className="xml-toggle"
            onClick={() => onToggle(node.id)}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.name}`}
            aria-expanded={expanded}
          >
            <ChevronRight
              size={15}
              className={`transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </button>
        ) : (
          <span className="xml-toggle-spacer" />
        )}
        <Code2 size={14} className="xml-node-icon" />
        <span className="xml-punctuation">&lt;</span>
        <span className="xml-tag">{node.name}</span>
        {node.attributes.map((attribute) => (
          <span key={`${node.id}-${attribute.name}`} className="xml-attribute">
            <span className="xml-attribute-name"> {attribute.name}</span>
            <span className="xml-punctuation">=</span>
            <span className="xml-attribute-value">"{attribute.value}"</span>
          </span>
        ))}
        <span className="xml-punctuation">{hasChildren ? ">" : " />"}</span>
        {hasChildren && !expanded && (
          <button
            type="button"
            className="xml-summary"
            onClick={() => onToggle(node.id)}
          >
            {node.children.length}{" "}
            {node.children.length === 1 ? "node" : "nodes"} …{" "}
            <span className="xml-punctuation">&lt;/{node.name}&gt;</span>
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <>
          {node.children.map((child) => (
            <XmlNode
              key={child.id}
              node={child}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
          <div className="xml-line" style={padding}>
            <span className="xml-toggle-spacer" />
            <span className="xml-punctuation">&lt;/</span>
            <span className="xml-tag">{node.name}</span>
            <span className="xml-punctuation">&gt;</span>
          </div>
        </>
      )}
    </div>
  );
}

const DEFAULT_INPUT = `<?xml version="1.0" encoding="UTF-8"?>
<user id="101" active="true">
  <name>Biswajit</name>
  <email>example@gmail.com</email>
  <roles>
    <role>developer</role>
    <role>admin</role>
  </roles>
</user>`;

export default function XmlFormatter() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [tree, setTree] = useState<XmlNodeData[]>([]);
  const [formattedXml, setFormattedXml] = useState("");
  const [hasResult, setHasResult] = useState(false);
  const [error, setError] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const expandablePaths = useMemo(() => collectExpandablePaths(tree), [tree]);

  function handleFormat() {
    setError("");
    setCopied(false);
    try {
      const document = parseXml(input);
      setTree(getXmlTree(document));
      setFormattedXml(formatXml(document));
      setCollapsed(new Set());
      setHasResult(true);
    } catch (cause) {
      setTree([]);
      setFormattedXml("");
      setHasResult(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to parse this XML document.",
      );
    }
  }

  function togglePath(path: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  async function copyFormatted() {
    try {
      await navigator.clipboard.writeText(formattedXml);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not access the clipboard. Check browser permissions.");
    }
  }

  function clearInput() {
    setInput("");
    setTree([]);
    setFormattedXml("");
    setHasResult(false);
    setError("");
    setCopied(false);
    setCollapsed(new Set());
  }

  return (
    <ShadowModule css={styles} includeShadowStyles>
      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-section-border bg-section p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-text">XML input</h2>
              <p className="mt-1 text-sm text-subtext">
                Paste an XML document to validate and format it.
              </p>
            </div>
            <button
              type="button"
              onClick={clearInput}
              className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
            >
              <RotateCcw size={15} />
              Clear
            </button>
          </div>
          <textarea
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError("");
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="XML input"
            placeholder="Paste your XML here..."
            className="mt-4 min-h-64 w-full resize-y rounded-lg border border-section-border bg-dark p-4 font-mono text-sm leading-6 text-text outline-none placeholder:text-subtext/60 focus:border-subtext"
          />
          {error && (
            <p
              role="alert"
              className="mt-3 max-h-40 overflow-auto rounded-md bg-status-error/10 p-3 text-sm text-status-error"
            >
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleFormat}
            disabled={!input.trim()}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-btn px-4 py-2.5 font-medium text-dark hover:bg-btn-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileCode2 size={17} />
            Parse &amp; Format
          </button>
          <p className="mt-3 text-xs text-subtext">
            Validates XML and normalizes indentation to 2 spaces. Attributes,
            comments, CDATA and processing instructions are retained.
          </p>
        </div>

        {hasResult && (
          <div className="min-w-0 rounded-2xl border border-section-border bg-section p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">
                  Formatted output
                </h2>
                <p className="mt-1 text-sm text-subtext">
                  Collapsible XML tree · 2-space indentation
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCollapsed(new Set())}
                  className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
                >
                  <Expand size={15} />
                  Expand all
                </button>
                <button
                  type="button"
                  onClick={() => setCollapsed(new Set(expandablePaths))}
                  className="flex items-center gap-2 rounded-md border border-section-border px-3 py-2 text-sm text-text hover:bg-dark"
                >
                  <Minimize2 size={15} />
                  Collapse all
                </button>
                <button
                  type="button"
                  onClick={copyFormatted}
                  className="flex items-center gap-2 rounded-md bg-btn px-3 py-2 text-sm font-medium text-dark hover:bg-btn-hover"
                >
                  {copied ? <Check size={15} /> : <Copy size={15} />}
                  {copied ? "Copied" : "Copy XML"}
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-section-border bg-dark p-3 sm:p-4">
              <div className="min-w-max">
                {tree.map((node) => (
                  <XmlNode
                    key={node.id}
                    node={node}
                    depth={0}
                    collapsed={collapsed}
                    onToggle={togglePath}
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-subtext">
              <span>XML elements and attributes are shown separately.</span>
              <button
                type="button"
                onClick={copyFormatted}
                className="inline-flex items-center gap-1 hover:text-text"
              >
                <Clipboard size={13} />
                Copy formatted XML
              </button>
            </div>
          </div>
        )}
      </section>
    </ShadowModule>
  );
}
