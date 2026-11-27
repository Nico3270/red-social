"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function DemoBootstrap({ children }: { children: ReactNode }) {
  const [showContent, setShowContent] = useState(false);
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const fragment = window.location.hash;
    if (!fragment) {
      setShowContent(true);
      return;
    }
    const match = /^#token=([A-Za-z0-9_-]{43})$/.exec(fragment);
    try {
      window.history.replaceState(window.history.state, "", "/demo");
    } catch {
      return;
    }
    if (!match || match[0] !== fragment) {
      setError("El enlace no es válido.");
      return;
    }
    void fetch("/api/business-demo/bootstrap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      body: JSON.stringify({ token: match[1] }),
    })
      .then((response) => {
        if (response.ok) window.location.replace("/demo");
        else
          setError(
            "La demo no está disponible, expiró o fue revocada. Solicita otro enlace.",
          );
      })
      .catch(() => setError("No pudimos abrir la demo. Intenta nuevamente."));
  }, []);
  return error ? (
    <p role="alert" className="p-4 text-center text-red-700">
      {error}
    </p>
  ) : showContent ? (
    children
  ) : (
    <p role="status" className="p-4 text-center">
      Validando demostración…
    </p>
  );
}
