"use client";

import { useEffect, useRef, type RefObject } from "react";

/** UI only: preserve the opener and contain keyboard navigation in custom dialogs. */
export function useDialogFocus(
  open: boolean,
  root: RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), textarea, select, video[controls], [tabindex="0"]',
        ) || [],
      ).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() =>
      controls()[0]?.focus({ preventScroll: true }),
    );
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        !root.current?.contains(document.activeElement)
      )
        return;
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = controls(),
        first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [open, root]);
}
