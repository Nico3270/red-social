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

const toneIcons: Record<DiscoveryPulseTone, typeof FaCompass> = {
  social: FaNewspaper,
  business: FaBuilding,
  mixed: FaCompass,
  service: FaTools,
};

export const DiscoveryPulseModule: React.FC<DiscoveryPulseModuleProps> = ({
  badge,
  title,
  tone,
  itemCount,
  children,
}) => {
  const Icon = toneIcons[tone];
  const gridClassName =
    itemCount > 1
      ? "grid grid-cols-1 gap-3 lg:grid-cols-2"
      : "grid max-w-3xl grid-cols-1 gap-3";

  return (
    <section className="mb-4 min-w-0" aria-label={title}>
      <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold text-slate-600">
        <Icon aria-hidden="true" className="shrink-0" />
        <span>{badge}</span>
      </div>
      <div className={gridClassName}>{children}</div>
    </section>
  );
};

export default DiscoveryPulseModule;
