"use client";

import { useEffect, useState } from "react";

type MediaType = "IMAGEN" | "VIDEO" | undefined;

const IMAGE_FALLBACK_ASPECT_RATIO = 1;
const VIDEO_FALLBACK_ASPECT_RATIO = 9 / 16;

export function useMediaAspectRatio(url: string | undefined, tipo: MediaType) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const updateAspectRatio = (nextAspectRatio: number) => {
      if (isActive) {
        setAspectRatio(nextAspectRatio);
      }
    };

    const fallbackAspectRatio =
      tipo === "VIDEO" ? VIDEO_FALLBACK_ASPECT_RATIO : IMAGE_FALLBACK_ASPECT_RATIO;

    if (!url) {
      updateAspectRatio(fallbackAspectRatio);
      return () => {
        isActive = false;
      };
    }

    setAspectRatio(null);

    if (tipo === "VIDEO") {
      const video = document.createElement("video");

      const cleanupVideo = () => {
        video.onloadedmetadata = null;
        video.onerror = null;
        video.removeAttribute("src");
        video.load();
        video.remove();
      };

      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      video.onloadedmetadata = () => {
        const safeAspectRatio =
          video.videoWidth && video.videoHeight
            ? video.videoWidth / video.videoHeight
            : VIDEO_FALLBACK_ASPECT_RATIO;

        updateAspectRatio(safeAspectRatio || VIDEO_FALLBACK_ASPECT_RATIO);
        cleanupVideo();
      };

      video.onerror = () => {
        updateAspectRatio(VIDEO_FALLBACK_ASPECT_RATIO);
        cleanupVideo();
      };

      video.src = `${url}#t=0.1`;

      return () => {
        isActive = false;
        cleanupVideo();
      };
    }

    const img = new window.Image();

    const cleanupImage = () => {
      img.onload = null;
      img.onerror = null;
    };

    img.onload = () => {
      const safeAspectRatio =
        img.naturalWidth && img.naturalHeight
          ? img.naturalWidth / img.naturalHeight
          : IMAGE_FALLBACK_ASPECT_RATIO;

      updateAspectRatio(safeAspectRatio || IMAGE_FALLBACK_ASPECT_RATIO);
      cleanupImage();
    };

    img.onerror = () => {
      updateAspectRatio(IMAGE_FALLBACK_ASPECT_RATIO);
      cleanupImage();
    };

    img.src = url;

    return () => {
      isActive = false;
      cleanupImage();
    };
  }, [url, tipo]);

  return aspectRatio;
}
