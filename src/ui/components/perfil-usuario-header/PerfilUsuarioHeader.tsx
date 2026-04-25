"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FaMapMarkerAlt,
  FaLink,
  FaChevronDown,
  FaInstagram,
  FaFacebook,
  FaTiktok,
  FaYoutube,
  FaWhatsapp,
  FaRegNewspaper,
  FaStore,
  FaBriefcase,
  FaCalendarCheck,
  FaRegCommentDots,
  FaPencilAlt,
  FaHome,
  FaStar,
  FaInfoCircle,
} from "react-icons/fa";
import { Button } from "../button/Button";
import clsx from "clsx";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import { EstadoNegocio } from "@prisma/client";
import { ProductGridWithSectionFilter } from "../sectonFilterBar/SectionFilterBar";
import Image from "next/image";
import Link from "next/link";
import { SiGooglemaps } from "react-icons/si";
import FeedPublicaciones from "@/publicaciones/componentes/FeedPublicaciones";
import ServicioViewer from "@/servicios/componentes/ServicioViewer";
import ResenaProductoCard from "@/resenas/componentes/ResenaProductoCard";
import type { ServicioData } from "@/servicios/interfaces/servicios.interface";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { FollowButton } from "@/feed/componentes/FollowButton";
import type { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import type { ResumenPerfil } from "@/perfil/interfaces/resumenPerfil.interface";
import LandingPage from "@/perfil/componentes/ PerfilLanding";
import type {
  BusinessGuideResolvedPreset,
  ProductGuideExploreContext,
} from "@/perfil/guide/business-guide.types";
import CatalogGroupsPublicView from "@/ui/components/dashboard/catalogGroups/CatalogGroupsPublicView";
import RestaurantCatalogView from "@/ui/components/dashboard/catalogGroups/RestaurantCatalogView";
import type { CatalogGroupTreeNode } from "@/actions/catalogGroups/getCatalogGroupsTree";
import type { ProfileCatalogPreloadData } from "@/actions/catalogGroups/preloadProfileCatalog";
import {
  buildProfileUrl,
  findGroupInTree,
  getFirstValidGroup,
  isValidGroup,
  resolveGroupSlugToIdInTree,
  urlParamToTab,
} from "@/perfil/helpers/catalog-group-url";
import { resolveSectionSlugToId } from "@/perfil/helpers/catalog-section-url";
import { trackAnalyticsEvent } from "@/analytics/events";
import {
  PLACEHOLDER_BUSINESS_IMAGE,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";
import {
  reportOperationalError,
  reportOperationalWarning,
} from "@/lib/observability/operationalLogger";

interface TabErrorBoundaryState {
  hasError: boolean;
}

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  TabErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): TabErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportOperationalError({
      area: "public-profile",
      event: "profile_tab_render_failed",
      message: "Una pestaña del perfil público falló durante el renderizado.",
      error,
      context: {
        componentStack: errorInfo.componentStack,
      },
      dedupeKey: `profile-tab-render-failed:${error.message}`,
    });
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export interface InformacionInicialNegocio {
  nombreNegocio: string;
  slugNegocio: string;
  negocioId: string;
  descripcionNegocio: string;
  telefonoNegocio: string;
  ciudadNegocio: string;
  departamentoNegocio: string;
  direccionNegocio?: string;
  telefonoContacto?: string;
  imagenPerfil?: string;
  imagenPortada?: string;
  sitioWeb?: string;
  urlGoogleMaps?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  tiktok?: string;
  youtube?: string;
  latitudNegocio: number;
  longitudNegocio: number;
  categoriaIds: string[];
  seccionesIds: string[];
  estadoNegocio: EstadoNegocio;
  configReservation: boolean;
  configEncuestas: boolean;
}

interface Props {
  activeTabComponent: "Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas";
  productos?: ProductRedSocial[];
  publicaciones?: EnhancedPublicacion[];
  informacionNegocio?: InformacionInicialNegocio;
  seccionesProductos?: { id: string; nombre: string; slug: string };
  resumenPerfil?: ResumenPerfil;
  resenas?: EnhancedPublicacion[];
  servicios?: ServicioData[];
  catalogPreloadData?: ProfileCatalogPreloadData;
  initialTab?: string;
  initialGroupSlug?: string;
  initialSectionSlug?: string;
}

type ProfileTab = "Inicio" | "Publicaciones" | "Productos" | "Negocio" | "Reseñas";

export default function PerfilUsuarioHeader({
  productos = [],
  publicaciones = [],
  activeTabComponent,
  informacionNegocio,
  resumenPerfil,
  catalogPreloadData,
  initialTab,
  initialGroupSlug,
  initialSectionSlug,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navigationMode = catalogPreloadData?.navigationMode || "traditional";
  const analyticsNavigationMode =
    navigationMode === "catalogGroups" ? "catalog_groups" : "traditional";
  const catalogGroupsTree = useMemo(
    () => (catalogPreloadData?.catalogGroupsTree ?? []) as CatalogGroupTreeNode[],
    [catalogPreloadData?.catalogGroupsTree]
  );
  const buildExternalHref = useCallback((value?: string, type: "default" | "whatsapp" = "default") => {
    if (!value?.trim()) {
      return "";
    }

    if (type === "whatsapp") {
      const phoneNumber = value.replace(/\D/g, "");
      return phoneNumber ? `https://wa.me/${phoneNumber}` : "";
    }

    if (/^(https?:)?\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("tel:")) {
      return value.startsWith("//") ? `https:${value}` : value;
    }

    return `https://${value}`;
  }, []);
  const getCompactWebsiteLabel = useCallback(
    (value?: string) => {
      const href = buildExternalHref(value);

      if (!href) {
        return "";
      }

      try {
        const parsedUrl = new URL(href);
        const host = parsedUrl.hostname.replace(/^www\./i, "");
        const path = parsedUrl.pathname && parsedUrl.pathname !== "/" ? parsedUrl.pathname : "";
        const compactValue = `${host}${path}`.replace(/\/$/, "");

        return compactValue.length > 28 ? `${compactValue.slice(0, 28)}…` : compactValue;
      } catch {
        const fallbackValue = href
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .replace(/\/$/, "");

        return fallbackValue.length > 28 ? `${fallbackValue.slice(0, 28)}…` : fallbackValue;
      }
    },
    [buildExternalHref]
  );
  const shouldDefaultToProducts = useMemo(() => {
    if (initialTab) {
      return false;
    }

    const productCount = resumenPerfil?.productos ?? productos.length ?? 0;
    const publicationCount = resumenPerfil?.publicaciones ?? 0;
    const serviceCount = resumenPerfil?.servicios ?? 0;
    const reviewCount = resumenPerfil?.reseñas ?? 0;
    const maxNonProductCount = Math.max(publicationCount, serviceCount, reviewCount);
    const hasCatalogGroups = Boolean(
      catalogPreloadData?.hasCatalogGroups && (catalogPreloadData?.catalogGroupsTree?.length ?? 0) > 0
    );
    const hasRestaurantMenu = Boolean(catalogPreloadData?.isRestaurantMenuMode);
    const hasStrongTraditionalCatalog =
      productCount >= 12 && productCount >= Math.max(1, maxNonProductCount) * 2;

    return hasRestaurantMenu || hasCatalogGroups || hasStrongTraditionalCatalog;
  }, [
    catalogPreloadData?.catalogGroupsTree,
    catalogPreloadData?.hasCatalogGroups,
    catalogPreloadData?.isRestaurantMenuMode,
    initialTab,
    productos.length,
    resumenPerfil?.productos,
    resumenPerfil?.publicaciones,
    resumenPerfil?.reseñas,
    resumenPerfil?.servicios,
  ]);
  const requestedTab = useMemo(
    () =>
      ((initialTab
        ? urlParamToTab(initialTab)
        : shouldDefaultToProducts
          ? "Productos"
          : activeTabComponent) as ProfileTab) || "Inicio",
    [activeTabComponent, initialTab, shouldDefaultToProducts]
  );
  const requestedGroupIdFromUrl = useMemo(
    () => resolveGroupSlugToIdInTree(initialGroupSlug, catalogGroupsTree),
    [catalogGroupsTree, initialGroupSlug]
  );
  const resolvedGroupId = useMemo(() => {
    if (initialGroupSlug) {
      if (requestedGroupIdFromUrl && isValidGroup(requestedGroupIdFromUrl, catalogGroupsTree)) {
        return requestedGroupIdFromUrl;
      }

      if (
        catalogPreloadData?.initialGroupId &&
        isValidGroup(catalogPreloadData.initialGroupId, catalogGroupsTree)
      ) {
        return catalogPreloadData.initialGroupId;
      }

      if (navigationMode === "catalogGroups" && catalogGroupsTree.length > 0) {
        return getFirstValidGroup(catalogGroupsTree);
      }
    }

    return null;
  }, [
    catalogGroupsTree,
    catalogPreloadData?.initialGroupId,
    initialGroupSlug,
    navigationMode,
    requestedGroupIdFromUrl,
  ]);
  const resolvedGroupNode = useMemo(
    () => (resolvedGroupId ? findGroupInTree(resolvedGroupId, catalogGroupsTree) : null),
    [catalogGroupsTree, resolvedGroupId]
  );
  const initialSectionId = useMemo(
    () => resolveSectionSlugToId(initialSectionSlug),
    [initialSectionSlug]
  );

  const [activeTab, setActiveTab] = useState<ProfileTab>(requestedTab);
  const [servicios, setServicios] = useState<ServicioData[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);
  const [productGuideContext, setProductGuideContext] = useState<ProductGuideExploreContext | null>(null);
  const [selectedGroupIdFromNav, setSelectedGroupIdFromNav] = useState<string | null>(resolvedGroupId);
  const previousTabRef = useRef<string>(requestedTab === "Productos" ? "direct" : requestedTab);
  const invalidGroupTrackedRef = useRef(false);
  const deepLinkTrackedRef = useRef<string | null>(null);

  const { data: session } = useSession();
  const isNegocio = session?.user.negocioSlug === informacionNegocio?.slugNegocio;

  const resenas = useMemo(
    () => publicaciones.filter((pub) => pub.tipo === "TESTIMONIO" && pub.producto),
    [publicaciones]
  );

  const selectedGroupNodeFromNav = useMemo(
    () =>
      selectedGroupIdFromNav
        ? findGroupInTree(selectedGroupIdFromNav, catalogGroupsTree)
        : null,
    [catalogGroupsTree, selectedGroupIdFromNav]
  );
  const currentProfileUrl = useMemo(() => {
    if (!informacionNegocio?.slugNegocio) {
      return pathname || "";
    }

    return buildProfileUrl(
      informacionNegocio.slugNegocio,
      searchParams.get("tab") ?? undefined,
      searchParams.get("group") ?? undefined
    );
  }, [informacionNegocio?.slugNegocio, pathname, searchParams]);
  const pendingProfileUrlRef = useRef(currentProfileUrl);

  useEffect(() => {
    pendingProfileUrlRef.current = currentProfileUrl;
  }, [currentProfileUrl]);

  const navigateToProfileUrl = useCallback(
    (nextUrl: string, mode: "push" | "replace" = "replace") => {
      if (!nextUrl || pendingProfileUrlRef.current === nextUrl) {
        return;
      }

      pendingProfileUrlRef.current = nextUrl;

      if (mode === "replace") {
        router.replace(nextUrl);
        return;
      }

      router.push(nextUrl);
    },
    [router]
  );

  useEffect(() => {
    setActiveTab(requestedTab);
  }, [requestedTab]);

  useEffect(() => {
    setSelectedGroupIdFromNav((currentGroupId) =>
      currentGroupId === resolvedGroupId ? currentGroupId : resolvedGroupId
    );
  }, [resolvedGroupId]);

  const handleCatalogGroupChange = useCallback(
    (newGroupId: string | null) => {
      setSelectedGroupIdFromNav((currentGroupId) =>
        currentGroupId === newGroupId ? currentGroupId : newGroupId
      );

      if (
        activeTab !== "Productos" ||
        navigationMode !== "catalogGroups" ||
        !informacionNegocio?.slugNegocio
      ) {
        return;
      }

      const nextGroupSlug = newGroupId
        ? findGroupInTree(newGroupId, catalogGroupsTree)?.slug
        : undefined;

      if (newGroupId && !nextGroupSlug) {
        return;
      }

      navigateToProfileUrl(
        buildProfileUrl(
          informacionNegocio.slugNegocio,
          "productos",
          nextGroupSlug
        ),
        "replace"
      );
    },
    [
      activeTab,
      catalogGroupsTree,
      informacionNegocio?.slugNegocio,
      navigateToProfileUrl,
      navigationMode,
    ]
  );

  const handleExploreGuideProducts = useCallback(
    (selection: BusinessGuideResolvedPreset) => {
      setActiveTab("Productos");

      if (!informacionNegocio?.slugNegocio) {
        return;
      }

      const shouldOpenFullCatalog = selection.preset.id === "universal:catalog";

      if (shouldOpenFullCatalog) {
        setProductGuideContext(null);
        setSelectedGroupIdFromNav(null);
        navigateToProfileUrl(
          buildProfileUrl(informacionNegocio.slugNegocio, "productos"),
          "push"
        );
        return;
      }

      setProductGuideContext(selection.exploreContext);

      if (selection.exploreContext.groupId) {
        setSelectedGroupIdFromNav(selection.exploreContext.groupId);
      } else if (navigationMode === "catalogGroups") {
        setSelectedGroupIdFromNav(null);
      }

      const targetGroupSlug =
        selection.exploreContext.groupSlug ||
        (selection.exploreContext.groupId
          ? findGroupInTree(selection.exploreContext.groupId, catalogGroupsTree)?.slug
          : undefined);

      navigateToProfileUrl(
        buildProfileUrl(
          informacionNegocio.slugNegocio,
          "productos",
          targetGroupSlug
        ),
        "push"
      );
    },
    [
      catalogGroupsTree,
      informacionNegocio?.slugNegocio,
      navigateToProfileUrl,
      navigationMode,
    ]
  );

  const handleChangeTab = useCallback(
    (tab: ProfileTab) => {
      if (tab === activeTab) {
        return;
      }

      setActiveTab(tab);

      if (informacionNegocio?.slugNegocio) {
        const groupSlug =
          tab === "Productos" && navigationMode === "catalogGroups"
            ? selectedGroupNodeFromNav?.slug
            : undefined;

        navigateToProfileUrl(
          buildProfileUrl(informacionNegocio.slugNegocio, tab, groupSlug),
          "push"
        );
        trackAnalyticsEvent({
          event: "catalog_group_tab_selected",
          timestamp: Date.now(),
          negocioSlug: informacionNegocio.slugNegocio,
          navigationMode: analyticsNavigationMode,
          source: "url",
          tab,
          previousTab: activeTab,
          groupSlug,
        });
      }
    },
    [
      activeTab,
      analyticsNavigationMode,
      informacionNegocio?.slugNegocio,
      navigateToProfileUrl,
      navigationMode,
      selectedGroupNodeFromNav?.slug,
    ]
  );

  useEffect(() => {
    if (
      navigationMode === "catalogGroups" &&
      initialGroupSlug &&
      !requestedGroupIdFromUrl &&
      resolvedGroupNode &&
      informacionNegocio?.slugNegocio &&
      !invalidGroupTrackedRef.current
    ) {
      invalidGroupTrackedRef.current = true;

      trackAnalyticsEvent({
        event: "catalog_group_invalid_url_fallback",
        timestamp: Date.now(),
        negocioSlug: informacionNegocio.slugNegocio,
        navigationMode: analyticsNavigationMode,
        source: "url",
        requestedGroupSlug: initialGroupSlug,
        fallbackGroupId: resolvedGroupNode.id,
        fallbackGroupSlug: resolvedGroupNode.slug,
        fallbackGroupName: resolvedGroupNode.nombre ?? "",
      });

      reportOperationalWarning({
        area: "public-profile",
        event: "catalog_group_invalid_url_fallback",
        message: "Se detectó un deep link inválido y se aplicó fallback a un grupo válido.",
        context: {
          negocioSlug: informacionNegocio.slugNegocio,
          requestedGroupSlug: initialGroupSlug,
          fallbackGroupId: resolvedGroupNode.id,
          fallbackGroupSlug: resolvedGroupNode.slug,
        },
        dedupeKey: `invalid-group-fallback:${informacionNegocio.slugNegocio}:${initialGroupSlug}`,
      });

      if (requestedTab === "Productos") {
        navigateToProfileUrl(
          buildProfileUrl(
            informacionNegocio.slugNegocio,
            "productos",
            resolvedGroupNode.slug
          ),
          "replace"
        );
      }
    }
  }, [
    analyticsNavigationMode,
    informacionNegocio?.slugNegocio,
    initialGroupSlug,
    navigationMode,
    navigateToProfileUrl,
    requestedGroupIdFromUrl,
    requestedTab,
    resolvedGroupNode,
  ]);

  useEffect(() => {
    if (
      activeTab !== "Productos" ||
      !informacionNegocio?.slugNegocio ||
      !resolvedGroupNode ||
      !initialGroupSlug
    ) {
      return;
    }

    const deepLinkKey = `${resolvedGroupNode.id}:${initialGroupSlug}`;
    if (deepLinkTrackedRef.current === deepLinkKey) {
      return;
    }

    deepLinkTrackedRef.current = deepLinkKey;
    trackAnalyticsEvent({
      event: "group_deep_link_opened",
      timestamp: Date.now(),
      negocioSlug: informacionNegocio.slugNegocio,
      navigationMode: analyticsNavigationMode,
      source: "url",
      groupId: resolvedGroupNode.id,
      groupSlug: resolvedGroupNode.slug,
      groupName: resolvedGroupNode.nombre ?? "",
      urlParams: {
        tab: initialTab ?? "",
        group: initialGroupSlug,
      },
    });
  }, [
    activeTab,
    analyticsNavigationMode,
    informacionNegocio?.slugNegocio,
    initialGroupSlug,
    initialTab,
    resolvedGroupNode,
  ]);

  useEffect(() => {
    if (activeTab !== "Productos" || !informacionNegocio?.slugNegocio) {
      previousTabRef.current = activeTab;
      return;
    }

    trackAnalyticsEvent({
      event: "products_tab_opened",
      timestamp: Date.now(),
      negocioSlug: informacionNegocio.slugNegocio,
      navigationMode: analyticsNavigationMode,
      source: "url",
      fromTab: previousTabRef.current,
      groupId: selectedGroupNodeFromNav?.id,
      groupSlug: selectedGroupNodeFromNav?.slug,
      isDeepLink: Boolean(initialGroupSlug),
    });

    previousTabRef.current = activeTab;
  }, [
    activeTab,
    analyticsNavigationMode,
    informacionNegocio?.slugNegocio,
    initialGroupSlug,
    selectedGroupNodeFromNav?.id,
    selectedGroupNodeFromNav?.slug,
  ]);

  useEffect(() => {
    const fetchServicios = async () => {
      if (activeTab !== "Negocio" || !informacionNegocio?.slugNegocio || servicios.length > 0) {
        return;
      }

      try {
        setLoadingServicios(true);
        const res = await fetch(`/api/getServiciosBySlug?slug=${informacionNegocio.slugNegocio}`);
        if (!res.ok) throw new Error("Error al obtener servicios");
        const data = await res.json();
        setServicios(data.servicios || []);
      } catch (err) {
        reportOperationalError({
          area: "public-profile",
          event: "profile_services_fetch_failed",
          message: "No fue posible cargar los servicios del negocio en el perfil público.",
          error: err,
          context: {
            negocioSlug: informacionNegocio.slugNegocio,
            activeTab,
          },
          dedupeKey: `profile-services-fetch:${informacionNegocio.slugNegocio}`,
        });
        setServicios([]);
      } finally {
        setLoadingServicios(false);
      }
    };

    void fetchServicios();
  }, [activeTab, informacionNegocio?.slugNegocio, servicios.length]);

  const redes = [
    {
      icon: <FaInstagram aria-label="Instagram" />,
      url: buildExternalHref(informacionNegocio?.instagram),
      color: "text-pink-600 hover:text-pink-700",
      label: "Instagram",
    },
    {
      icon: <FaFacebook aria-label="Facebook" />,
      url: buildExternalHref(informacionNegocio?.facebook),
      color: "text-blue-600 hover:text-blue-700",
      label: "Facebook",
    },
    {
      icon: <FaTiktok aria-label="TikTok" />,
      url: buildExternalHref(informacionNegocio?.tiktok),
      color: "text-gray-900 hover:text-gray-800",
      label: "TikTok",
    },
    {
      icon: <FaYoutube aria-label="YouTube" />,
      url: buildExternalHref(informacionNegocio?.youtube),
      color: "text-red-600 hover:text-red-700",
      label: "YouTube",
    },
    {
      icon: <FaWhatsapp aria-label="WhatsApp" />,
      url: buildExternalHref(informacionNegocio?.telefonoContacto, "whatsapp"),
      color: "text-green-600 hover:text-green-700",
      label: "WhatsApp",
    },
    {
      icon: <SiGooglemaps aria-label="Google Maps" />,
      url: buildExternalHref(informacionNegocio?.urlGoogleMaps),
      color: "text-rose-600 hover:text-rose-700",
      label: "Google Maps",
    },
  ];

  const visibleRedes = redes.filter(({ url }) => url?.trim() !== "");
  const socialGridColumns = Math.min(Math.max(visibleRedes.length, 1), 6);
  const safeCoverImage = resolveSafeImageSource(
    informacionNegocio?.imagenPortada,
    PLACEHOLDER_BUSINESS_IMAGE
  );
  const safeProfileImage = resolveSafeImageSource(
    informacionNegocio?.imagenPerfil,
    PLACEHOLDER_BUSINESS_IMAGE
  );
  const tabAccentStyles: Record<ProfileTab, string> = {
    Inicio: "text-slate-600",
    Publicaciones: "text-sky-600",
    Productos: "text-amber-600",
    Negocio: "text-emerald-600",
    Reseñas: "text-violet-600",
  };
  const tabActiveSurfaceStyles: Record<ProfileTab, string> = {
    Inicio: "bg-slate-100 text-slate-900 shadow-sm ring-1 ring-slate-200",
    Publicaciones: "bg-sky-50 text-slate-900 shadow-sm ring-1 ring-sky-100",
    Productos: "bg-amber-50 text-slate-900 shadow-sm ring-1 ring-amber-100",
    Negocio: "bg-emerald-50 text-slate-900 shadow-sm ring-1 ring-emerald-100",
    Reseñas: "bg-violet-50 text-slate-900 shadow-sm ring-1 ring-violet-100",
  };
  const tabContextCopy: Record<ProfileTab, { description: string; dotClassName: string }> = {
    Inicio: {
      description: "Empieza por una ruta rápida y entra al contenido principal sin perder contexto.",
      dotClassName: "bg-slate-400",
    },
    Publicaciones: {
      description: "Novedades, promociones y señales de actividad reciente del negocio.",
      dotClassName: "bg-sky-500",
    },
    Productos: {
      description: "Catálogo activo del negocio, listo para explorar, elegir y comprar.",
      dotClassName: "bg-amber-500",
    },
    Negocio: {
      description: "Servicios y oferta complementaria para entender mejor todo lo que ofrece.",
      dotClassName: "bg-emerald-500",
    },
    Reseñas: {
      description: "Opiniones y experiencias que ayudan a decidir con más confianza.",
      dotClassName: "bg-violet-500",
    },
  };

  const tabs = [
    { name: "Inicio", isActive: true },
    { name: "Publicaciones", isActive: (resumenPerfil?.publicaciones ?? 0) > 0 },
    { name: "Productos", isActive: (resumenPerfil?.productos ?? 0) > 0 || catalogGroupsTree.length > 0 },
    { name: "Negocio", isActive: (resumenPerfil?.servicios ?? 0) > 0 },
    { name: "Reseñas", isActive: (resumenPerfil?.reseñas ?? 0) > 0 },
  ].filter((tab) => tab.isActive) as Array<{ name: ProfileTab; isActive: boolean }>;

  useEffect(() => {
    if (!tabs.some((tab) => tab.name === activeTab)) {
      setActiveTab(tabs[0]?.name ?? "Inicio");
    }
  }, [activeTab, tabs]);
  const rawBusinessDescription = informacionNegocio?.descripcionNegocio?.trim() ?? "";
  const compactDescriptionPreview =
    rawBusinessDescription.length > 118
      ? `${rawBusinessDescription.slice(0, 118).trim()}…`
      : rawBusinessDescription;
  const websiteHref = buildExternalHref(informacionNegocio?.sitioWeb);
  const negocioSlug = informacionNegocio?.slugNegocio ?? "";
  const mapsHref = buildExternalHref(informacionNegocio?.urlGoogleMaps);
  const compactWebsiteLabel = getCompactWebsiteLabel(informacionNegocio?.sitioWeb);
  const compactLocationLabel = [informacionNegocio?.ciudadNegocio, informacionNegocio?.departamentoNegocio]
    .filter(Boolean)
    .join(", ");
  const fullLocationLabel = [
    compactLocationLabel,
    informacionNegocio?.direccionNegocio?.trim() || "",
  ]
    .filter(Boolean)
    .join(" - ");
  const shouldShowWebsiteLink = useMemo(() => {
    if (!websiteHref || !compactWebsiteLabel) {
      return false;
    }

    try {
      const parsedUrl = new URL(websiteHref);
      const normalizedHost = parsedUrl.hostname.replace(/^www\./i, "");
      const isInternalProfileLink =
        normalizedHost.includes("myckeo.com") && parsedUrl.pathname.startsWith("/perfil/");

      return !isInternalProfileLink;
    } catch {
      return !/\/perfil\//i.test(websiteHref);
    }
  }, [compactWebsiteLabel, websiteHref]);
  const primaryButtonBase =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-2";
  const secondaryButtonBase =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2";
  const showOwnerEditAction = Boolean(isNegocio);
  const showReservationAction = !isNegocio && Boolean(informacionNegocio?.configReservation);
  const showFollowAction = !isNegocio;
  const showSurveyAction = !isNegocio && Boolean(informacionNegocio?.configEncuestas);
  const showSecondaryActionRow = showFollowAction || showSurveyAction;
  const secondaryActionGridClass =
    showFollowAction && showSurveyAction ? "grid grid-cols-2 gap-2" : "grid grid-cols-1 gap-2";
  const followButtonClass =
    "mt-0 !min-w-0 !w-full !rounded-xl !px-4 !py-2.5 text-sm font-semibold focus:ring-slate-300";
  const hasExpandedProfileInfo = Boolean(
    rawBusinessDescription ||
      fullLocationLabel ||
      shouldShowWebsiteLink ||
      mapsHref ||
      visibleRedes.length > 0
  );
  const infoPanelGridColumns = Math.min(Math.max(visibleRedes.length, 1), 6);
  const hasLocationChip = Boolean(compactLocationLabel);
  const hasInfoTrigger = hasExpandedProfileInfo;
  const hasDualHeaderChips = hasLocationChip && hasInfoTrigger;
  const activeTabContext = tabContextCopy[activeTab];

  return (
    <div className="w-full overflow-auto rounded-b-3xl bg-white shadow-lg">
      <div className="relative h-40 w-full bg-gray-200 sm:h-56 md:h-80 lg:h-96">
        <Image
          src={safeCoverImage}
          alt={`Portada de ${informacionNegocio?.nombreNegocio || "Negocio"}`}
          className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          width={1200}
          height={400}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />

        <div className="absolute bottom-[-16px] left-4 z-10 sm:left-6">
          <Image
            src={safeProfileImage}
            alt={`Perfil de ${informacionNegocio?.nombreNegocio || "Negocio"}`}
            className="h-20 w-20 rounded-full border-[3px] border-white object-cover shadow-lg transition-transform duration-300 hover:scale-105 sm:h-28 sm:w-28 lg:h-36 lg:w-36"
            width={160}
            height={160}
            loading="lazy"
          />
        </div>
      </div>

      <div className="px-4 pb-2 pt-6 sm:px-6 sm:pt-10 md:px-8 lg:px-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex max-w-2xl flex-col space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[2rem] font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                {informacionNegocio?.nombreNegocio}
              </h1>
            </div>
            <p className="text-sm text-slate-500 sm:text-base">@{informacionNegocio?.slugNegocio}</p>

            <div className="space-y-2">
              {compactDescriptionPreview && (
                <p className="line-clamp-2 text-sm leading-6 text-slate-700 sm:text-base">
                  {compactDescriptionPreview}
                </p>
              )}

              <div
                className={clsx(
                  "grid w-full gap-2 text-sm text-slate-600 sm:max-w-[440px] sm:text-base",
                  hasDualHeaderChips ? "grid-cols-2" : "grid-cols-1"
                )}
              >
                {compactLocationLabel && (
                  <span
                    className={clsx(
                      "inline-flex min-h-[40px] w-full max-w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:text-sm",
                      !hasDualHeaderChips && "sm:max-w-[260px]"
                    )}
                  >
                    <FaMapMarkerAlt className="shrink-0 text-slate-400" />
                    <span className="truncate text-center">{compactLocationLabel}</span>
                  </span>
                )}

                {hasExpandedProfileInfo && (
                  <button
                    type="button"
                    onClick={() => setIsInfoPanelOpen((current) => !current)}
                    className={clsx(
                      "group inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-1 sm:text-sm",
                      isInfoPanelOpen
                        ? "border-[#5f1f2d] bg-[linear-gradient(135deg,#7b2738_0%,#551b27_100%)] text-white shadow-[0_12px_24px_rgba(93,38,51,0.28)] ring-1 ring-[#f2c8c5]/30 focus:ring-[#c48793]"
                        : "border-[#6f2533] bg-[linear-gradient(135deg,#8b3142_0%,#6c2230_100%)] text-white shadow-[0_10px_22px_rgba(122,53,68,0.18)] hover:border-[#62202d] hover:bg-[linear-gradient(135deg,#7f2c3c_0%,#5e1d2a_100%)] focus:ring-[#d7a3a0]"
                    )}
                    aria-expanded={isInfoPanelOpen}
                    aria-controls="profile-info-contact-panel"
                  >
                    <span
                      className={clsx(
                        "flex h-5 w-5 items-center justify-center rounded-full transition-colors",
                        isInfoPanelOpen
                          ? "bg-white/16 text-rose-50"
                          : "bg-white/14 text-rose-50 group-hover:bg-white/18"
                      )}
                    >
                      <FaInfoCircle className="text-[11px]" />
                    </span>
                    <span>Info y contacto</span>
                    <FaChevronDown
                      className={clsx(
                        "text-[11px] transition-transform duration-200",
                        isInfoPanelOpen ? "rotate-180 text-white" : "text-[#8a3d49]"
                      )}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-stretch gap-2.5 sm:w-auto sm:min-w-[280px] lg:min-w-[420px] xl:min-w-[480px]">
            <div className="w-full space-y-2">
              {showOwnerEditAction ? (
                <Link href="/dashboard/editar-perfil" className="flex w-full">
                  <Button
                    className={clsx(
                      primaryButtonBase,
                      "w-full bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-400"
                    )}
                    aria-label="Editar perfil"
                  >
                    <FaPencilAlt className="text-sm" />
                    Editar perfil
                  </Button>
                </Link>
              ) : (
                <>
                  {showReservationAction && (
                    <Link href={`/reservas/${negocioSlug}`} className="flex w-full">
                      <Button
                        className={clsx(
                          primaryButtonBase,
                          "w-full bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400"
                        )}
                        aria-label="Solicitar reserva"
                      >
                        <FaCalendarCheck className="text-sm" />
                        Solicitar reserva
                      </Button>
                    </Link>
                  )}

                  {showSecondaryActionRow && (
                    <div className={secondaryActionGridClass}>
                      {showFollowAction && (
                        <FollowButton
                          followedId={informacionNegocio?.negocioId || ""}
                          type="USER_TO_BUSINESS"
                          className={followButtonClass}
                        />
                      )}

                      {showSurveyAction && (
                        <Link href={`/encuestas/${negocioSlug}`} className="flex">
                          <Button className={clsx(secondaryButtonBase, "w-full")} aria-label="Deja tu opinión">
                            <FaRegCommentDots className="text-sm" />
                            Evalúanos
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {!showOwnerEditAction && showReservationAction && showSurveyAction && (
              <div className="flex items-center justify-start">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  <FaCalendarCheck className="text-[10px]" />
                  Reserva y opiniones activas
                </span>
              </div>
            )}
          </div>
        </div>

        {hasExpandedProfileInfo && isInfoPanelOpen && (
          <div
            id="profile-info-contact-panel"
            className="mt-3 rounded-[22px] border border-[#ead2cf] bg-[linear-gradient(180deg,rgba(255,248,247,0.96),rgba(248,250,252,0.98))] p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)] sm:p-5"
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
              <div className="space-y-4">
                {rawBusinessDescription && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Sobre el negocio
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">
                      {rawBusinessDescription}
                    </p>
                  </div>
                )}

                {fullLocationLabel && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Ubicación
                    </p>
                    <div className="mt-2 flex items-start gap-2.5 text-sm text-slate-700 sm:text-base">
                      <FaMapMarkerAlt className="mt-0.5 shrink-0 text-slate-400" />
                      <span>{fullLocationLabel}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {(shouldShowWebsiteLink || mapsHref) && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Enlaces útiles
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shouldShowWebsiteLink && (
                        <Link
                          href={websiteHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <FaLink className="text-slate-400" />
                          <span>{compactWebsiteLabel}</span>
                        </Link>
                      )}

                      {mapsHref && (
                        <Link
                          href={mapsHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                        >
                          <SiGooglemaps className="text-rose-500" />
                          <span>Cómo llegar</span>
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {visibleRedes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Contacto y redes
                    </p>
                    <div
                      className="mt-2 grid gap-2.5"
                      style={{ gridTemplateColumns: `repeat(${infoPanelGridColumns}, minmax(0, 1fr))` }}
                    >
                      {visibleRedes.map(({ icon, url, color, label }, index) => (
                        <Link
                          key={index}
                          href={url || ""}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={clsx(
                            "group mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-base shadow-sm transition hover:border-slate-300 hover:bg-slate-100 sm:h-11 sm:w-11 sm:text-[18px]",
                            color
                          )}
                          aria-label={label}
                        >
                          {icon}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 flex justify-start gap-1 overflow-x-auto whitespace-nowrap rounded-2xl border border-slate-200 bg-slate-50/90 p-1 lg:grid lg:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] lg:gap-2 lg:overflow-visible lg:p-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const icon =
              tab.name === "Inicio" ? (
                <FaHome className={clsx("text-base lg:text-lg", isActive ? tabAccentStyles[tab.name] : "text-slate-400")} />
              ) : tab.name === "Publicaciones" ? (
                <FaRegNewspaper className={clsx("text-base lg:text-lg", isActive ? tabAccentStyles[tab.name] : "text-slate-400")} />
              ) : tab.name === "Productos" ? (
                <FaStore className={clsx("text-base lg:text-lg", isActive ? tabAccentStyles[tab.name] : "text-slate-400")} />
              ) : tab.name === "Negocio" ? (
                <FaBriefcase className={clsx("text-base lg:text-lg", isActive ? tabAccentStyles[tab.name] : "text-slate-400")} />
              ) : (
                <FaStar className={clsx("text-base lg:text-lg", isActive ? tabAccentStyles[tab.name] : "text-slate-400")} />
              );

            return (
              <button
                key={tab.name}
                onClick={() => handleChangeTab(tab.name)}
                className={clsx(
                  "group flex min-w-max shrink-0 items-center gap-2 rounded-[14px] px-3.5 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 sm:px-4 lg:min-h-[54px] lg:min-w-0 lg:w-full lg:justify-center lg:gap-2.5 lg:px-5 lg:text-[15px]",
                  isActive
                    ? tabActiveSurfaceStyles[tab.name]
                    : "text-slate-500 hover:bg-white/80 hover:text-slate-900"
                )}
                aria-current={isActive ? "page" : undefined}
                aria-expanded={isActive}
              >
                {icon}
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center gap-2 px-1 text-[12px] font-medium text-slate-500 sm:mt-3 sm:text-sm">
          <span className={clsx("h-2 w-2 rounded-full", activeTabContext.dotClassName)} />
          <span>{activeTabContext.description}</span>
        </div>

        <div className="mt-2.5 space-y-2.5 transition-opacity duration-300 ease-in-out sm:mt-5">
          {activeTab === "Inicio" && (
            <LandingPage
              informacionNegocio={informacionNegocio!}
              productos={productos}
              publicaciones={publicaciones || []}
              resenas={resenas}
              servicios={servicios}
              resumenPerfil={resumenPerfil!}
              onSelectTab={handleChangeTab}
              onExploreProducts={handleExploreGuideProducts}
              onSelectGroupFromNav={(groupId: string) => {
                setSelectedGroupIdFromNav(groupId);
                setActiveTab("Productos");

                if (informacionNegocio?.slugNegocio) {
                  const group = findGroupInTree(groupId, catalogGroupsTree);
                  if (group) {
                    navigateToProfileUrl(
                      buildProfileUrl(
                        informacionNegocio.slugNegocio,
                        "productos",
                        group.slug
                      ),
                      "push"
                    );
                  }
                }
              }}
              catalogPreloadData={catalogPreloadData}
            />
          )}

          {activeTab === "Publicaciones" && (
            <div className="flex flex-col items-center gap-3 text-base text-gray-700 sm:text-lg">
              <TabErrorBoundary
                fallback={
                  <div className="rounded-lg bg-gray-50 p-8 text-center text-gray-500">
                    <p className="mb-2">Error al cargar publicaciones.</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Recargar página
                    </button>
                  </div>
                }
              >
                {publicaciones.length > 0 ? (
                  <FeedPublicaciones publicaciones={publicaciones} />
                ) : (
                  <div className="flex flex-col items-center justify-center pb-8">
                    <p className="mb-2 text-center text-lg font-bold text-gray-800">
                      No hay publicaciones disponibles.
                    </p>
                    <Image
                      src="/imgs/no_publicaciones.png"
                      alt="No hay publicaciones disponibles"
                      width={500}
                      height={500}
                      className="mb-4 h-auto w-full max-w-xs object-contain md:max-w-md lg:max-w-lg"
                      loading="lazy"
                    />
                  </div>
                )}
              </TabErrorBoundary>
            </div>
          )}

          {activeTab === "Productos" && (
            <div className="flex w-full flex-col gap-4 text-gray-700">
              {navigationMode === "catalogGroups" && catalogGroupsTree.length > 0 ? (
                catalogPreloadData?.isRestaurantMenuMode ? (
                  <RestaurantCatalogView
                    groupsTree={catalogGroupsTree}
                    negocioSlug={informacionNegocio?.slugNegocio || ""}
                    catalogProducts={productos}
                    initialGroupId={selectedGroupIdFromNav || undefined}
                    initialGroupProducts={
                      selectedGroupIdFromNav &&
                      selectedGroupIdFromNav === catalogPreloadData?.initialGroupId
                        ? catalogPreloadData?.initialGroupProducts
                        : undefined
                    }
                    guideContext={productGuideContext}
                    onGroupChange={handleCatalogGroupChange}
                  />
                ) : (
                  <CatalogGroupsPublicView
                    groupsTree={catalogGroupsTree}
                    negocioSlug={informacionNegocio?.slugNegocio || ""}
                    catalogProducts={productos}
                    initialGroupId={selectedGroupIdFromNav || undefined}
                    initialGroupProducts={
                      selectedGroupIdFromNav &&
                      selectedGroupIdFromNav === catalogPreloadData?.initialGroupId
                        ? catalogPreloadData?.initialGroupProducts
                        : undefined
                    }
                    guideContext={productGuideContext}
                    onGroupChange={handleCatalogGroupChange}
                  />
                )
              ) : productos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <p className="mb-2 text-center text-lg font-bold text-gray-800">
                    No hay productos disponibles.
                  </p>
                  <Image
                    src="/imgs/no_productos.png"
                    alt="No hay productos disponibles"
                    width={500}
                    height={500}
                    className="mb-4 h-auto w-full max-w-xs object-contain md:max-w-md lg:max-w-lg"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="mx-auto w-full max-w-[1560px] px-4 sm:px-6 lg:px-8 2xl:px-10">
                  <ProductGridWithSectionFilter
                    initialProducts={productos}
                    slug={informacionNegocio?.slugNegocio || ""}
                    guideContext={productGuideContext}
                    initialSectionId={initialSectionId}
                    analyticsContext={{
                      negocioSlug: informacionNegocio?.slugNegocio || "",
                      navigationMode: "traditional",
                      source: "productos_tab",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "Negocio" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 sm:text-3xl">
                <FaBriefcase className="text-xl text-yellow-600 sm:text-3xl" />
                Servicios del Negocio
              </h2>

              {loadingServicios ? (
                <div className="animate-pulse space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex h-32 items-center rounded-lg bg-gray-200 p-4">
                      <div className="h-4 w-3/4 flex-1 rounded bg-gray-300" />
                      <div className="ml-4 h-16 w-16 rounded-full bg-gray-300" />
                    </div>
                  ))}
                </div>
              ) : servicios.length > 0 ? (
                <div className="flex flex-col gap-6">
                  {servicios.map((servicio, idx) => (
                    <ServicioViewer key={servicio.id || idx} servicio={servicio} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pb-8">
                  <p className="mb-2 text-center text-lg font-bold text-gray-800">
                    No hay servicios disponibles para este negocio.
                  </p>
                  <Image
                    src="/imgs/no_servicios.png"
                    alt="No hay servicios disponibles"
                    width={500}
                    height={500}
                    className="mb-4 h-auto w-full max-w-xs object-contain md:max-w-md lg:max-w-lg"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "Reseñas" && (
            <div className="flex flex-col gap-4 text-gray-700">
              <h2 className="flex items-center justify-center gap-2 text-lg font-semibold text-gray-900 sm:text-3xl">
                <FaStar className="text-xl text-indigo-600 sm:text-3xl" />
                Reseñas del Negocio
              </h2>

              {resenas.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 px-2 sm:grid-cols-2 sm:px-4 md:px-8 lg:grid-cols-3">
                  {resenas.map((resena, idx) => (
                    <ResenaProductoCard key={resena.id || idx} publicacion={resena} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pb-8">
                  <p className="mb-2 text-center text-lg font-bold text-gray-800">
                    No hay reseñas disponibles para este negocio.
                  </p>
                  <Image
                    src="/imgs/no_resenas.png"
                    alt="No hay reseñas disponibles"
                    width={500}
                    height={500}
                    className="mb-4 h-auto w-full max-w-xs object-contain md:max-w-md lg:max-w-lg"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
