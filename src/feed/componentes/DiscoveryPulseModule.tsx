"use client";

import { ReactNode } from "react";
import {
  FaBuilding,
  FaCompass,
  FaNewspaper,
  FaTools,
} from "react-icons/fa";

export type DiscoveryPulseTone = "social" | "business" | "mixed" | "service";

interface DiscoveryPulseModuleProps {
  badge: string;
  title: string;
  description: string;
  tone: DiscoveryPulseTone;
  city?: string;
  itemCount: number;
  children: ReactNode;
}

const toneStyles: Record<
  DiscoveryPulseTone,
  {
    container: string;
    badge: string;
    Icon: typeof FaCompass;
  }
> = {
  social: {
    container: "border-sky-100 bg-gradient-to-br from-sky-50 via-white to-white",
    badge: "bg-sky-100 text-sky-700",
    Icon: FaNewspaper,
  },
  business: {
    container:
      "border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white",
    badge: "bg-emerald-100 text-emerald-700",
    Icon: FaBuilding,
  },
  mixed: {
    container:
      "border-violet-100 bg-gradient-to-br from-violet-50 via-white to-white",
    badge: "bg-violet-100 text-violet-700",
    Icon: FaCompass,
  },
  service: {
    container:
      "border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white",
    badge: "bg-orange-100 text-orange-700",
    Icon: FaTools,
  },
};

export const DiscoveryPulseModule: React.FC<DiscoveryPulseModuleProps> = ({
  badge,
  title,
  description,
  tone,
  city,
  itemCount,
  children,
}) => {
  const toneStyle = toneStyles[tone];
  const gridClassName =
    itemCount > 1
      ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
      : "grid max-w-3xl grid-cols-1 gap-3";

  return (
    <section
      className={`mb-5 overflow-hidden rounded-3xl border p-3 shadow-sm sm:p-4 ${toneStyle.container}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${toneStyle.badge}`}
            >
              <toneStyle.Icon className="text-[10px]" />
              {badge}
            </span>
            {city && (
              <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm">
                {city}
              </span>
            )}
          </div>

          <h3 className="mt-3 text-base font-semibold text-slate-900 sm:text-lg">
            {title}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>

      <div className={`mt-4 ${gridClassName}`}>{children}</div>
    </section>
  );
};

export default DiscoveryPulseModule;
