"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function Panel({
  active,
  autoFocus = true,
  initialFocusSelector,
  mobile,
  title,
  children,
  onEscape,
  className = "",
}: {
  active: boolean;
  autoFocus?: boolean;
  initialFocusSelector?: string;
  mobile: boolean;
  title: string;
  children: ReactNode;
  onEscape: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!active || !autoFocus) return;
    const target =
      (initialFocusSelector &&
        ref.current?.querySelector<HTMLElement>(initialFocusSelector)) ||
      ref.current?.querySelector<HTMLElement>(
        initialFocusSelector
          ? "[data-list-heading]"
          : "[data-initial-focus], button, input",
      );
    target?.focus({ preventScroll: true });
  }, [active, title, autoFocus, initialFocusSelector]);
  return (
    <section
      ref={ref}
      hidden={!active}
      role={mobile ? "dialog" : "region"}
      aria-modal={mobile ? true : undefined}
      aria-label={title}
      className={`surface panel ${className}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          e.preventDefault();
          onEscape();
        }
        if (!mobile || e.key !== "Tab") return;
        const nodes = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input, textarea, select, summary, [tabindex="0"]',
          ) ?? []),
        ].filter((el) => el.getClientRects().length);
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
    >
      {children}
    </section>
  );
}
