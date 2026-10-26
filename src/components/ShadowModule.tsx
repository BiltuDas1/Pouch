import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import shadowStyles from "../styles/shadow/main.css?inline";

interface ShadowModuleProps {
  children: ReactNode;
  css: string;
  includeShadowStyles?: boolean;
}

export default function ShadowModule({
  children,
  css,
  includeShadowStyles = false,
}: ShadowModuleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = includeShadowStyles ? `${shadowStyles}\n${css}` : css;

    root.appendChild(style);
    setShadowRoot(root);

    return () => {
      style.remove();
      setShadowRoot(null);
    };
  }, [css, includeShadowStyles]);

  return (
    <div ref={hostRef}>{shadowRoot && createPortal(children, shadowRoot)}</div>
  );
}
