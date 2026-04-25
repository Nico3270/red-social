"use client";

import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BusinessGuideEntry } from "./BusinessGuideEntry";
import type {
  BusinessGuideIntroChoice,
  BusinessGuidePrimaryCta,
  BusinessGuideQuickAccess,
  BusinessGuideSecondaryToggle,
} from "./BusinessGuideEntry";
import type { BusinessGuideSocialTeaserData } from "./BusinessGuideSocialTeaser";
import { BusinessGuideResults } from "./BusinessGuideResults";
import {
  getBusinessGuideConfig,
  resolveBusinessGuidePreset,
} from "@/perfil/guide/business-guide";
import type {
  BusinessGuideBusinessInfo,
  BusinessGuideConfig,
  BusinessGuidePresetId,
  BusinessGuideResolvedPreset,
} from "@/perfil/guide/business-guide.types";
import type { ProductRedSocial } from "@/interfaces/productRedSocial.interface";
import type { ProfileCatalogPreloadData } from "@/actions/catalogGroups/preloadProfileCatalog";
import type { EnhancedPublicacion } from "@/publicaciones/interfaces/enhancedPublicacion.interface";
import { trackAnalyticsEvent } from "@/analytics/events";
import {
  PLACEHOLDER_PRODUCT_IMAGE,
  isRenderableImageSource,
  resolveSafeImageSource,
} from "@/lib/media/resolveSafeImageSource";

interface Props {
  business: BusinessGuideBusinessInfo;
  products: ProductRedSocial[];
  onExploreProducts: (selection: BusinessGuideResolvedPreset) => void;
  onViewCatalog: () => void;
  onViewBusiness?: () => void;
  onViewPublications?: () => void;
  serviceCount?: number;
  publicationCount?: number;
  recentPublication?: EnhancedPublicacion | null;
  isCommercialGuideOpen?: boolean;
  onOpenCommercialGuide?: () => void;
  onCloseCommercialGuide?: () => void;
  catalogPreloadData?: ProfileCatalogPreloadData;
}

const buildWhatsappHref = (value?: string) => {
  if (!value?.trim()) {
    return "";
  }

  const phoneNumber = value.replace(/\D/g, "");
  return phoneNumber ? `https://wa.me/${phoneNumber}` : "";
};

const fallbackGuideConfig: BusinessGuideConfig = {
  vertical: "generic",
  title: "Empieza por lo mas util",
  subtitle: "Agrupamos accesos claros para que el perfil se sienta util sin volverse pesado desde la primera vista.",
  helperText: "La guia se adapta a lo que el negocio si puede ofrecer en este momento.",
  presets: [],
};

const publicationTypeLabels: Record<EnhancedPublicacion["tipo"], string> = {
  CARRUSEL_IMAGENES: "Carrusel",
  VIDEO_HORIZONTAL: "Video",
  VIDEO_VERTICAL: "Video",
  PRODUCTO_DESTACADO: "Destacado",
  MINI_GRID: "Coleccion",
  TESTIMONIO: "Historia",
};

const getPublicationImageSrc = (publication?: EnhancedPublicacion | null) => {
  const media =
    publication?.multimedia.find((item) => isRenderableImageSource(item.url)) ||
    publication?.multimedia[0];

  return resolveSafeImageSource(media?.url, PLACEHOLDER_PRODUCT_IMAGE);
};

const truncateText = (value: string, maxLength: number) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trim()}...` : value;

export function BusinessGuideSection({
  business,
  products,
  onExploreProducts,
  onViewCatalog,
  onViewBusiness,
  onViewPublications,
  serviceCount = 0,
  publicationCount = 0,
  recentPublication,
  isCommercialGuideOpen = false,
  onOpenCommercialGuide,
  onCloseCommercialGuide,
  catalogPreloadData,
}: Props) {
  const router = useRouter();
  const [selectionState, setSelectionState] = useState<{
    selectedPresetId: BusinessGuidePresetId | null;
    isPending: boolean;
  }>({
    selectedPresetId: null,
    isPending: false,
  });
  const navigationMode = catalogPreloadData?.hasCatalogGroups ? "catalog_groups" : "traditional";
  const baseConfig = useMemo(
    () => getBusinessGuideConfig(business, products, catalogPreloadData?.groupsSignal),
    [business, products, catalogPreloadData?.groupsSignal]
  );
  const contactHref = useMemo(
    () =>
      buildWhatsappHref(
        business.telefonoContacto ||
          business.telefonoNegocio ||
          products.find((product) => product.telefonoContacto)?.telefonoContacto
      ),
    [business.telefonoContacto, business.telefonoNegocio, products]
  );
  const hasReservations = Boolean(business.configReservation);
  const hasServices = serviceCount > 0 && Boolean(onViewBusiness);
  const hasSocialPresence = Boolean(recentPublication && onViewPublications && publicationCount > 0);
  const isServiceLedBusiness =
    hasServices && serviceCount >= 3 && serviceCount > Math.max(products.length, 1);
  const hasFallbackGuide = hasReservations || hasServices || hasSocialPresence || Boolean(contactHref);
  const effectiveConfig = useMemo(() => {
    if (baseConfig) {
      return baseConfig;
    }

    if (hasFallbackGuide) {
      return fallbackGuideConfig;
    }

    return null;
  }, [baseConfig, hasFallbackGuide]);
  const presetSignature = effectiveConfig?.presets.map((preset) => preset.id).join("|") ?? "";

  useEffect(() => {
    setSelectionState({
      selectedPresetId: null,
      isPending: false,
    });
  }, [effectiveConfig?.vertical, business.slugNegocio, presetSignature, products.length]);

  const selectedResult = useMemo(() => {
    if (!baseConfig || !selectionState.selectedPresetId) return null;

    return resolveBusinessGuidePreset({
      business,
      products,
      catalogGroupsSignal: catalogPreloadData?.groupsSignal,
      presetId: selectionState.selectedPresetId,
      maxResults: 4,
    });
  }, [
    baseConfig,
    business,
    catalogPreloadData?.groupsSignal,
    products,
    selectionState.selectedPresetId,
  ]);

  useEffect(() => {
    if (!selectionState.isPending || !selectedResult) return;

    const timer = window.setTimeout(() => {
      setSelectionState((current) => ({ ...current, isPending: false }));
    }, 160);

    return () => window.clearTimeout(timer);
  }, [selectedResult, selectionState.isPending]);

  const trackGuideShortcut = useCallback(
    (shortcutId: string, shortcutLabel: string, shortcutKind: string) => {
      trackAnalyticsEvent({
        event: "guide_preset_clicked",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: shortcutId,
        presetLabel: shortcutLabel,
        presetKind: shortcutKind,
      });
    },
    [business.slugNegocio, navigationMode]
  );

  const handleViewCatalog = useCallback(() => {
    trackAnalyticsEvent({
      event: "guide_navigation_to_products",
      timestamp: Date.now(),
      negocioSlug: business.slugNegocio,
      navigationMode,
      source: "guia",
      presetId: "universal:catalog",
      presetLabel: "Ver catalogo",
    });

    onViewCatalog();
  }, [business.slugNegocio, navigationMode, onViewCatalog]);

  const handleViewBusiness = useCallback(() => {
    if (!onViewBusiness) {
      return;
    }

    trackGuideShortcut("action:services", "Ver servicios", "action");
    onViewBusiness();
  }, [onViewBusiness, trackGuideShortcut]);

  const handleReserve = useCallback(() => {
    trackGuideShortcut("action:reserve", "Reservar", "action");
    router.push(`/reservas/${business.slugNegocio}`);
  }, [business.slugNegocio, router, trackGuideShortcut]);

  const handleContact = useCallback(() => {
    if (!contactHref) {
      return;
    }

    trackGuideShortcut("action:contact", "Hablar con el negocio", "action");
    window.open(contactHref, "_blank", "noopener,noreferrer");
  }, [contactHref, trackGuideShortcut]);

  const handleViewRecent = useCallback(() => {
    if (!onViewPublications) {
      return;
    }

    trackGuideShortcut("route:recent", "Ver lo mas reciente", "route");
    onViewPublications();
  }, [onViewPublications, trackGuideShortcut]);

  const primaryCta = useMemo<BusinessGuidePrimaryCta>(() => {
    if (isServiceLedBusiness && onViewBusiness) {
      return {
        id: "primary:services",
        label: "Ver servicios",
        description: `${serviceCount} opciones para consultar o reservar`,
        icon: "services",
        onActivate: handleViewBusiness,
      };
    }

    if (products.length > 0 || (baseConfig?.presets.length ?? 0) > 0) {
      return {
        id: "primary:catalog",
        label: effectiveConfig?.vertical === "restaurant" ? "Ver menu completo" : "Ver catalogo",
        description:
          effectiveConfig?.vertical === "restaurant"
            ? "Todo el menu y sus categorias en una sola vista"
            : "Todo el catalogo en una sola vista",
        icon: "catalog",
        onActivate: handleViewCatalog,
      };
    }

    if (hasReservations) {
      return {
        id: "primary:reserve",
        label: "Reservar ahora",
        description: "Agenda directamente con el negocio",
        icon: "reservation",
        onActivate: handleReserve,
      };
    }

    if (hasServices && onViewBusiness) {
      return {
        id: "primary:services",
        label: "Ver servicios",
        description: `${serviceCount} opciones disponibles`,
        icon: "services",
        onActivate: handleViewBusiness,
      };
    }

    if (contactHref) {
      return {
        id: "primary:contact",
        label: "Hablar con el negocio",
        description: "Resuelve dudas o pide informacion directa",
        icon: "contact",
        onActivate: handleContact,
      };
    }

    return {
      id: "primary:social",
      label: "Ver lo mas reciente",
      description: "Conoce el movimiento y las novedades del negocio",
      icon: "social",
      onActivate: handleViewRecent,
    };
  }, [
    baseConfig?.presets.length,
    contactHref,
    effectiveConfig?.vertical,
    handleContact,
    handleReserve,
    handleViewBusiness,
    handleViewCatalog,
    handleViewRecent,
    hasReservations,
    hasServices,
    isServiceLedBusiness,
    onViewBusiness,
    products.length,
    serviceCount,
  ]);

  const hasPresetShortcuts = useMemo(
    () =>
      Boolean(
        effectiveConfig?.presets.some((preset) => {
          if (preset.id === "universal:catalog") {
            return false;
          }

          if (preset.id === "universal:contact" && contactHref) {
            return false;
          }

          return true;
        })
      ),
    [contactHref, effectiveConfig?.presets]
  );
  const hasCommercialPanel = primaryCta.id === "primary:catalog" && (hasPresetShortcuts || hasReservations || Boolean(contactHref));

  const handleOpenCommercialGuide = useCallback(() => {
    if (!hasCommercialPanel) {
      return;
    }

    trackGuideShortcut(
      "route:commercial",
      effectiveConfig?.vertical === "restaurant" ? "Ver atajos del menu" : "Ver atajos del catalogo",
      "route"
    );
    onOpenCommercialGuide?.();
  }, [
    effectiveConfig?.vertical,
    hasCommercialPanel,
    onOpenCommercialGuide,
    trackGuideShortcut,
  ]);

  const handleCloseCommercialGuide = useCallback(() => {
    setSelectionState({
      selectedPresetId: null,
      isPending: false,
    });
    onCloseCommercialGuide?.();
  }, [onCloseCommercialGuide]);

  const handleSelectPreset = useCallback(
    (presetId: BusinessGuidePresetId) => {
      const presetLabel =
        effectiveConfig?.presets.find((preset) => preset.id === presetId)?.label || presetId;
      const presetKind =
        effectiveConfig?.presets.find((preset) => preset.id === presetId)?.kind || "unknown";

      trackGuideShortcut(presetId, presetLabel, presetKind);

      startTransition(() => {
        setSelectionState({
          selectedPresetId: presetId,
          isPending: true,
        });
      });
    },
    [effectiveConfig?.presets, trackGuideShortcut]
  );

  const handleGuideResultClick = useCallback(
    (selection: BusinessGuideResolvedPreset, resultIndex: number) => {
      const item = selection.items[resultIndex];
      if (!item) {
        return;
      }

      trackAnalyticsEvent({
        event: "guide_result_clicked",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: selection.preset.id,
        presetLabel: selection.preset.label,
        productId: item.product.id,
        productSlug: item.product.slug,
        productName: item.product.nombre,
        productPrice: item.product.precio,
        resultIndex,
      });
    },
    [business.slugNegocio, navigationMode]
  );

  const handleExploreMore = useCallback(
    (selection: BusinessGuideResolvedPreset) => {
      trackAnalyticsEvent({
        event: "guide_navigation_to_products",
        timestamp: Date.now(),
        negocioSlug: business.slugNegocio,
        navigationMode,
        source: "guia",
        presetId: selection.preset.id,
        presetLabel: selection.preset.label,
        targetGroupId: selection.exploreContext.groupId,
        targetGroupSlug: selection.exploreContext.groupSlug,
        targetGroupName: selection.exploreContext.groupName,
      });

      onExploreProducts(selection);
    },
    [business.slugNegocio, navigationMode, onExploreProducts]
  );

  const quickActions = useMemo<BusinessGuideQuickAccess[]>(() => {
    if (!hasCommercialPanel) {
      return [];
    }

    const items: BusinessGuideQuickAccess[] = [];

    if (hasReservations) {
      items.push({
        id: "action:reserve",
        kind: "action",
        label: "Reservar",
        shortResultLabel: "Agenda en pocos pasos",
        icon: "reservation",
        priority: effectiveConfig?.vertical === "restaurant" ? 7 : 18,
        onActivate: handleReserve,
      });
    }

    if (contactHref) {
      items.push({
        id: "action:contact",
        kind: "action",
        label: "Hablar",
        shortResultLabel: "WhatsApp directo",
        icon: "contact",
        priority: hasReservations ? 52 : 46,
        onActivate: handleContact,
      });
    }

    return items;
  }, [
    contactHref,
    effectiveConfig?.vertical,
    handleContact,
    handleReserve,
    hasCommercialPanel,
    hasReservations,
  ]);

  const introChoices = useMemo<BusinessGuideIntroChoice[]>(() => {
    const items: BusinessGuideIntroChoice[] = [];
    const primaryTone: BusinessGuideIntroChoice["tone"] =
      primaryCta.id === "primary:social"
        ? "social"
        : primaryCta.id === "primary:reserve" || primaryCta.id === "primary:contact"
          ? "action"
          : "commercial";

    items.push({
      id: primaryCta.id,
      label: primaryCta.label,
      description: primaryCta.description,
      icon: primaryCta.icon,
      tone: primaryTone,
      isPrimary: true,
      onActivate: primaryCta.onActivate,
    });

    if (hasSocialPresence && primaryCta.id !== "primary:social") {
      items.push({
        id: "route:recent",
        label: "Ver lo mas reciente",
        description:
          publicationCount > 1
            ? `${publicationCount} publicaciones activas del negocio`
            : "La ultima novedad publicada por el negocio",
        icon: "social",
        tone: "social",
        onActivate: handleViewRecent,
      });
    }

    if (hasReservations && primaryCta.id !== "primary:reserve") {
      items.push({
        id: "route:reserve",
        label: "Reservar",
        description: "Agenda rapido sin salir del perfil",
        icon: "reservation",
        tone: "action",
        onActivate: handleReserve,
      });
    } else if (contactHref && primaryCta.id !== "primary:contact") {
      items.push({
        id: "route:contact",
        label: "Hablar con el negocio",
        description: "Canal directo para resolver dudas o pedir informacion",
        icon: "contact",
        tone: "action",
        onActivate: handleContact,
      });
    } else if (hasServices && onViewBusiness && primaryCta.id !== "primary:services") {
      items.push({
        id: "route:services",
        label: "Ver servicios",
        description: `${serviceCount} opciones disponibles para explorar`,
        icon: "services",
        tone: "action",
        onActivate: handleViewBusiness,
      });
    }

    return items.slice(0, 3);
  }, [
    contactHref,
    handleContact,
    handleReserve,
    handleViewBusiness,
    handleViewRecent,
    hasReservations,
    hasServices,
    hasSocialPresence,
    onViewBusiness,
    primaryCta,
    publicationCount,
    serviceCount,
  ]);

  const commercialPanelToggle = useMemo<BusinessGuideSecondaryToggle | null>(() => {
    if (!hasCommercialPanel) {
      return null;
    }

    const isRestaurant = effectiveConfig?.vertical === "restaurant";

    return {
      label: isCommercialGuideOpen
        ? isRestaurant
          ? "Ocultar atajos del menu"
          : "Ocultar atajos del catalogo"
        : isRestaurant
          ? "Ver atajos del menu"
          : "Ver atajos del catalogo",
      description: isRestaurant
        ? "Categorias, reservas y rutas utiles para entrar al menu con mas precision."
        : "Accesos curados para entrar al catalogo por rutas mas utiles y comerciales.",
      isOpen: isCommercialGuideOpen,
      onActivate: isCommercialGuideOpen ? handleCloseCommercialGuide : handleOpenCommercialGuide,
    };
  }, [
    effectiveConfig?.vertical,
    handleCloseCommercialGuide,
    handleOpenCommercialGuide,
    hasCommercialPanel,
    isCommercialGuideOpen,
  ]);

  const socialTeaser = useMemo<BusinessGuideSocialTeaserData | null>(() => {
    if (!hasSocialPresence || !recentPublication) {
      return null;
    }

    const primaryText =
      recentPublication.titulo?.trim() ||
      recentPublication.descripcion?.trim() ||
      `${publicationTypeLabels[recentPublication.tipo]} reciente`;
    const description =
      recentPublication.descripcion?.trim() ||
      recentPublication.titulo?.trim() ||
      "El negocio sigue compartiendo novedades y movimiento reciente.";

    return {
      eyebrow: "Negocio vivo",
      title: truncateText(primaryText, 64),
      description: truncateText(description, 112),
      meta:
        publicationCount > 1
          ? `${publicationCount} publicaciones recientes`
          : publicationTypeLabels[recentPublication.tipo],
      imageSrc: getPublicationImageSrc(recentPublication),
      actionLabel: "Ver publicaciones",
      onActivate: handleViewRecent,
    };
  }, [handleViewRecent, hasSocialPresence, publicationCount, recentPublication]);

  if (!effectiveConfig) {
    return null;
  }

  return (
    <section className="space-y-5" data-testid="business-guide-section">
      <BusinessGuideEntry
        config={effectiveConfig}
        selectedPresetId={selectionState.selectedPresetId}
        isPending={selectionState.isPending}
        onSelectPreset={handleSelectPreset}
        quickActions={quickActions}
        introChoices={introChoices}
        socialTeaser={socialTeaser}
        isCommercialPanelOpen={isCommercialGuideOpen}
        commercialPanelToggle={commercialPanelToggle}
        onCloseCommercialGuide={handleCloseCommercialGuide}
      />

      {selectedResult ? (
        <BusinessGuideResults
          selection={selectedResult}
          onExploreMore={handleExploreMore}
          onResultClick={handleGuideResultClick}
          onReset={() =>
            setSelectionState({
              selectedPresetId: null,
              isPending: false,
            })
          }
        />
      ) : null}
    </section>
  );
}
