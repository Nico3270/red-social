"use client";

import { useEffect, useRef } from "react";

const FRAGMENT_PATTERN = /^#token=([A-Za-z0-9_-]{43})$/;

export default function ActivationBootstrap() {
  const startedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    // StrictMode may replay setup after cleanup while the first POST is pending.
    // Restore liveness without starting another request.
    mountedRef.current = true;
    const cleanup = () => {
      mountedRef.current = false;
    };

    if (startedRef.current) return cleanup;
    startedRef.current = true;

    const fragment = window.location.hash;
    if (!fragment) return cleanup;

    const match = FRAGMENT_PATTERN.exec(fragment);
    // `$` can match before a final newline; require the entire fragment.
    const token = match?.[0] === fragment ? match[1] : null;

    try {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search,
      );
    } catch {
      // If URL sanitization fails, do not start transport.
      return cleanup;
    }

    if (!token) return cleanup;

    async function bootstrap(bearer: string): Promise<void> {
      try {
        const response = await fetch("/api/account-activation/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: bearer }),
          credentials: "same-origin",
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });

        if (!response.ok) return;

        const body: unknown = await response.json();
        if (
          mountedRef.current &&
          typeof body === "object" &&
          body !== null &&
          !Array.isArray(body) &&
          Object.keys(body).length === 1 &&
          "ok" in body &&
          body.ok === true
        ) {
          window.location.replace("/activar");
        }
      } catch {
        // Fail closed without retries, restoring the fragment or logging errors.
      }
    }

    void bootstrap(token);
    return cleanup;
  }, []);

  return null;
}
