import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ShadowModuleProps {
  children: ReactNode;
  css: string;
}

export default function ShadowModule({ children, css }: ShadowModuleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shadowRoot, setShadowRoot] = useState<ShadowRoot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = css;
    root.appendChild(style);

    setShadowRoot(root);

    return () => {
      style.remove();
      setShadowRoot(null);
    };
  }, [css]);

  return (
    <div ref={hostRef}>{shadowRoot && createPortal(children, shadowRoot)}</div>
  );
}
