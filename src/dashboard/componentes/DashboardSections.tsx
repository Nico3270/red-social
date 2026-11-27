"use client";

import { useId, useState } from "react";
import Link from "next/link";
import localFont from "next/font/local";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Layers3,
  MessageSquarePlus,
  Package,
  PackagePlus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRoundPen,
  WalletCards,
  X,
} from "lucide-react";
import type {
  DashboardGroup,
  DashboardIcon,
  DashboardSection,
} from "../dashboardMenu";
import styles from "./dashboardMenu.module.css";

// Keep this menu's font local without preloading the other display fonts.
const menuFont = localFont({
  src: "../../assets/fonts/inter-latin-variable.woff2",
  weight: "100 900",
  style: "normal",
  display: "swap",
});

const icons = {
  products: Package,
  newProduct: PackagePlus,
  catalog: Layers3,
  services: BriefcaseBusiness,
  orders: ShoppingBag,
  reservations: CalendarDays,
  transactions: WalletCards,
  publication: MessageSquarePlus,
  surveys: ClipboardList,
  qr: QrCode,
  business: Store,
  admin: ShieldCheck,
  user: UserRoundPen,
} satisfies Record<DashboardIcon, typeof Package>;

const noQuickActions: readonly DashboardSection[] = [];

const groupVisuals: Record<
  string,
  { icon: typeof Package; description: string }
> = {
  catalog: {
    icon: Layers3,
    description: "Organiza tu catálogo y tus servicios.",
  },
  operations: {
    icon: ShoppingBag,
    description: "Pedidos, agenda y movimientos.",
  },
  presence: {
    icon: Store,
    description: "Tu perfil y la conexión con tus clientes.",
  },
  administration: {
    icon: ShieldCheck,
    description: "Herramientas de plataforma y cuenta.",
  },
};

interface Props {
  groups: readonly DashboardGroup[];
  quickActions?: readonly DashboardSection[];
  businessName?: string | null;
  administrative?: boolean;
}

function SectionHeading({
  id,
  title,
  icon: Icon,
  description,
}: {
  id: string;
  title: string;
  icon: typeof Package;
  description: string;
}) {
  return (
    <header className={styles.sectionHeader}>
      <span className={styles.sectionIcon}>
        <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className={styles.sectionHeadingText}>
        <h2 className={styles.groupTitle} id={id}>
          {title}
        </h2>
        <p className={styles.groupDescription}>{description}</p>
      </div>
    </header>
  );
}

function MenuEntry({
  section,
  quick = false,
  idPrefix,
  onHelp,
}: {
  section: DashboardSection;
  quick?: boolean;
  idPrefix: string;
  onHelp: (section: DashboardSection) => void;
}) {
  const Icon = icons[section.icono];
  const titleId = idPrefix + "-" + section.id + "-title";
  const summaryId = idPrefix + "-" + section.id + "-summary";

  return (
    <li className={styles.entry + (quick ? " " + styles.quickEntry : "")}>
      <Link
        href={section.url}
        className={styles.entryLink}
        aria-labelledby={titleId}
        aria-describedby={summaryId}
      >
        <span className={styles.entryIcon}>
          <Icon size={21} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <span className={styles.entryText}>
          <span id={titleId} className={styles.entryTitle}>
            {section.titulo}
          </span>
          <span id={summaryId} className={styles.entrySummary}>
            {section.resumen}
          </span>
        </span>
        {quick ? (
          <ArrowUpRight
            className={styles.quickArrow}
            size={18}
            aria-hidden="true"
          />
        ) : (
          <ChevronRight
            className={styles.entryArrow}
            size={15}
            aria-hidden="true"
          />
        )}
      </Link>
      <button
        type="button"
        className={styles.helpButton}
        aria-label={"Información sobre " + section.titulo}
        aria-haspopup="dialog"
        onClick={() => onHelp(section)}
      >
        <CircleHelp size={18} strokeWidth={1.7} aria-hidden="true" />
      </button>
    </li>
  );
}

export default function DashboardSections({
  groups,
  quickActions = noQuickActions,
  businessName,
  administrative = false,
}: Props) {
  const menuId = useId();
  const [selectedSection, setSelectedSection] =
    useState<DashboardSection | null>(null);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const closeHelp = () => setSelectedSection(null);

  return (
    <div className={styles.menu + " " + menuFont.className}>
      <header className={styles.header}>
        <div className={styles.heading}>
          <p className={styles.eyebrow}>
            {administrative ? "MYCKEO · ADMINISTRACIÓN" : "MYCKEO BUSINESS"}
          </p>
          <h1 className={styles.title}>Panel de gestión</h1>
          <p className={styles.subtitle}>
            {administrative
              ? "Administra la plataforma y los datos de tu cuenta."
              : "Tu negocio, organizado. Elige lo que quieres hacer hoy."}
          </p>
        </div>
        {businessName ? (
          <p className={styles.business}>
            <Store size={16} strokeWidth={1.7} aria-hidden="true" />
            <span>{businessName}</span>
          </p>
        ) : null}
      </header>

      <nav
        className={styles.navigation}
        aria-label={
          administrative
            ? "Administración de Myckeo"
            : "Herramientas de administración"
        }
      >
        {quickActions.length > 0 ? (
          <section
            className={styles.quickSection}
            aria-labelledby={menuId + "-quick-title"}
          >
            <SectionHeading
              id={menuId + "-quick-title"}
              title="Acciones rápidas"
              icon={ArrowUpRight}
              description="Crea y comparte en pocos pasos."
            />
            <ul className={styles.quickActions}>
              {quickActions.map((section) => (
                <MenuEntry
                  key={section.id}
                  section={section}
                  quick
                  idPrefix={menuId}
                  onHelp={setSelectedSection}
                />
              ))}
            </ul>
          </section>
        ) : null}

        {groups.map((group) => {
          const visual = groupVisuals[group.id] ?? groupVisuals.administration;

          return (
            <section
              key={group.id}
              className={styles.category}
              data-category={group.id}
              aria-labelledby={menuId + "-" + group.id + "-title"}
            >
              <SectionHeading
                id={menuId + "-" + group.id + "-title"}
                title={group.titulo}
                icon={visual.icon}
                description={visual.description}
              />
              <ul className={styles.tools}>
                {group.sections.map((section) => (
                  <MenuEntry
                    key={section.id}
                    section={section}
                    idPrefix={menuId}
                    onHelp={setSelectedSection}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </nav>

      {selectedSection ? (
        <Dialog
          open
          onClose={closeHelp}
          transitionDuration={reducedMotion ? 0 : 120}
          fullWidth
          maxWidth="sm"
          aria-labelledby={menuId + "-help-title"}
          aria-describedby={menuId + "-help-description"}
          PaperProps={{
            className: styles.helpPaper + " " + menuFont.className,
          }}
        >
          <DialogTitle id={menuId + "-help-title"} className={styles.helpTitle}>
            {selectedSection.titulo}
          </DialogTitle>
          <button
            type="button"
            autoFocus
            className={styles.closeButton}
            onClick={closeHelp}
            aria-label="Cerrar información"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <DialogContent className={styles.helpContent}>
            <p id={menuId + "-help-description"}>
              {selectedSection.descripcion}
            </p>
          </DialogContent>
          <DialogActions className={styles.helpActions}>
            <Link
              href={selectedSection.url}
              onClick={closeHelp}
              className={styles.helpLink}
              aria-label={"Ir a " + selectedSection.titulo}
            >
              Ir a la sección <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </DialogActions>
        </Dialog>
      ) : null}
    </div>
  );
}
