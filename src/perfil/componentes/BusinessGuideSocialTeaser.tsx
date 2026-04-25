"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { FaArrowRight, FaRegNewspaper } from "react-icons/fa";
import { titleFont, textosFont } from "@/config/fonts";
import { getCloudinaryImageUrl } from "@/lib/cloudinary/buildCloudinaryDeliveryUrl";

export interface BusinessGuideSocialTeaserData {
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  imageSrc: string;
  actionLabel: string;
  onActivate: () => void;
}

interface Props {
  teaser: BusinessGuideSocialTeaserData;
}

export function BusinessGuideSocialTeaser({ teaser }: Props) {
  const optimizedTeaserImageUrl = getCloudinaryImageUrl(
    teaser.imageSrc,
    "publication-preview",
  );

  return (
    <motion.button
      type="button"
      onClick={teaser.onActivate}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24 }}
      className="group mt-3 flex w-full items-center gap-3 rounded-[20px] border border-sky-100 bg-[linear-gradient(135deg,rgba(240,249,255,0.94),rgba(255,255,255,0.98))] p-3 text-left shadow-[0_10px_24px_rgba(14,116,144,0.08)] transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_14px_28px_rgba(14,116,144,0.12)] sm:p-3.5"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
        <Image
          src={optimizedTeaserImageUrl}
          alt={teaser.title}
          fill
          sizes="80px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 via-transparent to-transparent" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-[11px] text-sky-700">
            <FaRegNewspaper />
          </span>
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700/80">
            {teaser.eyebrow}
          </span>
        </div>

        <h3 className={`line-clamp-1 text-sm font-semibold leading-5 text-slate-950 sm:text-base ${titleFont.className}`}>
          {teaser.title}
        </h3>
        <p className={`mt-1 line-clamp-2 text-xs leading-5 text-slate-600 sm:text-sm ${textosFont.className}`}>
          {teaser.description}
        </p>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium text-slate-500">
            {teaser.meta}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700">
            {teaser.actionLabel}
            <FaArrowRight className="text-[10px] transition group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}
