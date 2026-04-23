import type { ReactNode } from "react";

type MyckeoAdminSectionHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  rightContent?: ReactNode;
  footer?: ReactNode;
};

export default function MyckeoAdminSectionHeader({
  eyebrow = "Myckeo Admin",
  title,
  description,
  rightContent,
  footer,
}: MyckeoAdminSectionHeaderProps) {
  return (
    <header className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/95 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.28)] backdrop-blur">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.18),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(196,181,253,0.12),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,250,252,0.95))]">
        <div className="flex flex-col gap-6 px-6 py-6 sm:px-8 lg:flex-row lg:items-start lg:justify-between lg:py-8">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
              {eyebrow}
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                {description}
              </p>
            ) : null}
          </div>

          {rightContent ? (
            <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[240px] lg:items-end">
              {rightContent}
            </div>
          ) : null}
        </div>

        {footer ? (
          <div className="border-t border-slate-200/80 bg-white/70 px-6 py-4 sm:px-8">
            {footer}
          </div>
        ) : null}
      </div>
    </header>
  );
}
