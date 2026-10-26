import { useEffect, useState } from "react";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });

      const target = e.target;
      if (
        target instanceof Element &&
        target.closest("select, [role='listbox'], [role='option']")
      ) {
        setVisible(false);
      } else if (!(document.activeElement instanceof HTMLSelectElement)) {
        setVisible(true);
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.target instanceof Element && e.target.closest("select")) {
        setVisible(false);
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (e.target instanceof HTMLSelectElement) {
        setVisible(false);
      }
    };

    const handleFocusOut = () => {
      requestAnimationFrame(() => {
        if (!(document.activeElement instanceof HTMLSelectElement)) {
          setVisible(true);
        }
      });
    };

    const handleMouseLeave = () => setVisible(false);

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    document.documentElement.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
      document.documentElement.removeEventListener(
        "mouseleave",
        handleMouseLeave,
      );
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-9999 h-3 w-3 rounded-full bg-white"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        display: visible ? "block" : "none",
      }}
    />
  );
}
