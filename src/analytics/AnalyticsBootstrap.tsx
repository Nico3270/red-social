"use client";

import { useEffect } from "react";
import Script from "next/script";
import {
  getGa4MeasurementId,
  isAnalyticsDebugEnabled,
  setupAnalytics,
  trackAnalyticsPageView,
} from "@/analytics/config";

setupAnalytics();

export function AnalyticsBootstrap() {
  const measurementId = getGa4MeasurementId();
  const debugEnabled = isAnalyticsDebugEnabled();

  useEffect(() => {
    if (!measurementId || typeof window === "undefined") {
      return;
    }

    const trackCurrentPage = () => {
      trackAnalyticsPageView(
        window.location.pathname,
        window.location.search.replace(/^\?/, "")
      );
    };

    const scheduleTrackCurrentPage = () => {
      window.requestAnimationFrame(trackCurrentPage);
    };

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.pushState = function (...args: Parameters<History["pushState"]>) {
      originalPushState(...args);
      scheduleTrackCurrentPage();
    };

    window.history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      originalReplaceState(...args);
      scheduleTrackCurrentPage();
    };

    window.addEventListener("popstate", scheduleTrackCurrentPage);
    trackCurrentPage();

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", scheduleTrackCurrentPage);
    };
  }, [measurementId]);

  if (!measurementId) {
    return null;
  }

  return (
    <>
      <Script
        id="ga4-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = window.gtag || gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false,
            ${debugEnabled ? "debug_mode: true," : ""}
          });
        `}
      </Script>
    </>
  );
}