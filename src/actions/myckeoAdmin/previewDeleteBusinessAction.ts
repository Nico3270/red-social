"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export type PreviewDeleteBusinessImpactClassification =
  | "delete"
  | "preserve"
  | "set_null"
  | "manual_review";

export interface PreviewDeleteBusinessImpactItem {
  key: string;
  label: string;
  count: number;
  classification: PreviewDeleteBusinessImpactClassification;
  relationKind: "direct" | "indirect";
  notes: string[];
}

export interface PreviewDeleteBusinessActionInput {
  businessId: string;
}

export interface PreviewDeleteBusinessActionResult {
  ok: boolean;
  message: string;
  data: {
    business: {
      id: string;
      nombre: string;
      slug: string | null;
      estado: string;
      tipo: string;
      usuarioId: string;
      telefonoContacto: string | null;
      isTestData: boolean;
      archivedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    };
    canDelete: boolean;
    blockers: string[];
    warnings: string[];
    notes: string[];
    counts: Record<string, number>;
    impacts: PreviewDeleteBusinessImpactItem[];
    summary: {
      directDeleteCandidates: number;
      setNullCandidates: number;
      manualReviewCandidates: number;
      preserveCandidates: number;
      totalRelatedRecords: number;
    };
  } | null;
  error: string | null;
}

function buildTraceId(): string {
  return `preview-delete-business-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBusinessId(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function createImpactItem(
  key: string,
  label: string,
  count: number,
  classification: PreviewDeleteBusinessImpactClassification,
  relationKind: "direct" | "indirect",
  notes: string[]
): PreviewDeleteBusinessImpactItem {
  return {
    key,
    label,
    count,
    classification,
    relationKind,
    notes,
  };
}

export async function previewDeleteBusinessAction(
  input: PreviewDeleteBusinessActionInput
): Promise<PreviewDeleteBusinessActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      console.warn(`[previewDeleteBusinessAction][${traceId}] Sesión no válida`);
      return {
        ok: false,
        message: "No autorizado.",
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      console.warn(`[previewDeleteBusinessAction][${traceId}] Acceso denegado`, {
        userId: session.user.id,
        role: session.user.role,
      });
      return {
        ok: false,
        message: "No tienes permisos para consultar este preview.",
        data: null,
        error: "No tienes permisos para consultar este preview.",
      };
    }

    const businessId = normalizeBusinessId(input.businessId);

    if (!businessId) {
      return {
        ok: false,
        message: "El identificador del negocio es obligatorio.",
        data: null,
        error: "El identificador del negocio es obligatorio.",
      };
    }

    const business = await prisma.negocio.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        nombre: true,
        slug: true,
        estado: true,
        tipo: true,
        usuarioId: true,
        telefonoContacto: true,
        isTestData: true,
        archivedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!business) {
      return {
        ok: false,
        message: "El negocio no existe o ya no está disponible.",
        data: null,
        error: "El negocio no existe o ya no está disponible.",
      };
    }

    console.info(`[previewDeleteBusinessAction][${traceId}] Inicio`, {
      actorUserId: session.user.id,
      businessId,
    });

    const {
      productsCount,
      productImagesCount,
      productAttributesCount,
      productVariantsCount,
      servicesCount,
      serviceMediaCount,
      publicationsCount,
      publicationMediaCount,
      reservationsCount,
      availabilityCount,
      ordersCount,
      orderItemsCount,
      orderStatusHistoryCount,
      deliveryDataCount,
      transactionsCount,
      contactsCount,
      surveysCount,
      surveyQuestionLinksCount,
      surveyReviewsCount,
      surveyResponsesCount,
      businessOwnedQuestionsCount,
      adminLinkedQuestionsCount,
      externalBusinessQuestionLinksCount,
      followsCount,
      catalogGroupsCount,
      catalogGroupProductsCount,
      negocioCategoriesCount,
      negocioSectionsCount,
    } = await prisma.$transaction(async (tx) => {
      const [orderRows, surveyRows, businessQuestionRows] = await Promise.all([
        tx.order.findMany({
          where: { negocioId: businessId },
          select: {
            id: true,
            deliveryDataId: true,
            transactionId: true,
          },
        }),
        tx.encuesta.findMany({
          where: { negocioId: businessId },
          select: { id: true },
        }),
        tx.pregunta.findMany({
          where: {
            negocioId: businessId,
            creador: "NEGOCIO",
          },
          select: { id: true },
        }),
      ]);

      const orderIds = orderRows.map((order) => order.id);
      const deliveryDataIds = Array.from(
        new Set(
          orderRows
            .map((order) => order.deliveryDataId)
            .filter((value): value is string => Boolean(value))
        )
      );
      const transactionIdsFromOrders = Array.from(
        new Set(
          orderRows
            .map((order) => order.transactionId)
            .filter((value): value is string => Boolean(value))
        )
      );
      const surveyIds = surveyRows.map((survey) => survey.id);
      const businessQuestionIds = businessQuestionRows.map((question) => question.id);

      const [
        productsCount,
        productImagesCount,
        productAttributesCount,
        productVariantsCount,
        servicesCount,
        serviceMediaCount,
        publicationsCount,
        publicationMediaCount,
        reservationsCount,
        availabilityCount,
        orderItemsCount,
        orderStatusHistoryCount,
        contactsCount,
        surveyQuestionLinksCount,
        surveyReviewsCount,
        surveyResponsesCount,
        adminLinkedQuestionsCount,
        externalBusinessQuestionLinksCount,
        followsCount,
        catalogGroupsCount,
        catalogGroupProductsCount,
        negocioCategoriesCount,
        negocioSectionsCount,
      ] = await Promise.all([
        tx.product.count({ where: { negocioId: businessId } }),
        tx.image.count({ where: { product: { negocioId: businessId } } }),
        tx.productAttribute.count({ where: { product: { negocioId: businessId } } }),
        tx.productVariant.count({ where: { product: { negocioId: businessId } } }),
        tx.servicio.count({ where: { negocioId: businessId } }),
        tx.media.count({ where: { servicio: { is: { negocioId: businessId } } } }),
        tx.publicacion.count({ where: { negocioId: businessId } }),
        tx.media.count({ where: { publicacion: { is: { negocioId: businessId } } } }),
        tx.reservation.count({ where: { negocioId: businessId } }),
        tx.businessAvailability.count({ where: { negocioId: businessId } }),
        orderIds.length > 0
          ? tx.orderItem.count({
              where: { orderId: { in: orderIds } },
            })
          : Promise.resolve(0),
        orderIds.length > 0
          ? tx.orderStatusHistory.count({
              where: { orderId: { in: orderIds } },
            })
          : Promise.resolve(0),
        tx.contactos.count({ where: { negocioId: businessId } }),
        surveyIds.length > 0
          ? tx.encuestaPregunta.count({
              where: {
                encuestaId: {
                  in: surveyIds,
                },
              },
            })
          : Promise.resolve(0),
        surveyIds.length > 0
          ? tx.resena.count({
              where: {
                encuestaId: {
                  in: surveyIds,
                },
              },
            })
          : Promise.resolve(0),
        surveyIds.length > 0
          ? tx.respuesta.count({
              where: {
                resena: {
                  encuestaId: {
                    in: surveyIds,
                  },
                },
              },
            })
          : Promise.resolve(0),
        tx.pregunta.count({
          where: {
            negocioId: businessId,
            creador: "ADMIN",
          },
        }),
        businessQuestionIds.length > 0
          ? tx.encuestaPregunta.count({
              where: {
                preguntaId: { in: businessQuestionIds },
                encuesta: {
                  negocioId: {
                    not: businessId,
                  },
                },
              },
            })
          : Promise.resolve(0),
        tx.follow.count({ where: { followedBusinessId: businessId } }),
        tx.catalogGroup.count({ where: { negocioId: businessId } }),
        tx.catalogGroupProduct.count({
          where: {
            catalogGroup: {
              negocioId: businessId,
            },
          },
        }),
        tx.negocioCategory.count({ where: { negocioId: businessId } }),
        tx.negocioSection.count({ where: { negocioId: businessId } }),
      ]);

      const transactions =
        orderIds.length > 0 || transactionIdsFromOrders.length > 0
          ? await tx.transaction.findMany({
              where: {
                OR: [
                  ...(orderIds.length > 0 ? [{ orderId: { in: orderIds } }] : []),
                  ...(transactionIdsFromOrders.length > 0
                    ? [{ id: { in: transactionIdsFromOrders } }]
                    : []),
                ],
              },
              select: { id: true },
            })
          : [];

      return {
        productsCount,
        productImagesCount,
        productAttributesCount,
        productVariantsCount,
        servicesCount,
        serviceMediaCount,
        publicationsCount,
        publicationMediaCount,
        reservationsCount,
        availabilityCount,
        ordersCount: orderIds.length,
        orderItemsCount,
        orderStatusHistoryCount,
        deliveryDataCount: deliveryDataIds.length,
        transactionsCount: new Set(transactions.map((transaction) => transaction.id)).size,
        contactsCount,
        surveysCount: surveyIds.length,
        surveyQuestionLinksCount,
        surveyReviewsCount,
        surveyResponsesCount,
        businessOwnedQuestionsCount: businessQuestionIds.length,
        adminLinkedQuestionsCount,
        externalBusinessQuestionLinksCount,
        followsCount,
        catalogGroupsCount,
        catalogGroupProductsCount,
        negocioCategoriesCount,
        negocioSectionsCount,
      };
    });

    const counts: Record<string, number> = {
      products: productsCount,
      productImages: productImagesCount,
      productAttributes: productAttributesCount,
      productVariants: productVariantsCount,
      services: servicesCount,
      serviceMedia: serviceMediaCount,
      publications: publicationsCount,
      publicationMedia: publicationMediaCount,
      reservations: reservationsCount,
      availability: availabilityCount,
      orders: ordersCount,
      orderItems: orderItemsCount,
      orderStatusHistory: orderStatusHistoryCount,
      deliveryData: deliveryDataCount,
      transactions: transactionsCount,
      contacts: contactsCount,
      surveys: surveysCount,
      surveyQuestionLinks: surveyQuestionLinksCount,
      surveyReviews: surveyReviewsCount,
      surveyResponses: surveyResponsesCount,
      businessOwnedQuestions: businessOwnedQuestionsCount,
      adminLinkedQuestions: adminLinkedQuestionsCount,
      externalBusinessQuestionLinks: externalBusinessQuestionLinksCount,
      follows: followsCount,
      catalogGroups: catalogGroupsCount,
      catalogGroupProducts: catalogGroupProductsCount,
      negocioCategories: negocioCategoriesCount,
      negocioSections: negocioSectionsCount,
    };

    const impacts: PreviewDeleteBusinessImpactItem[] = [
      createImpactItem(
        "products",
        "Productos",
        productsCount,
        "delete",
        "direct",
        ["Relacion directa con onDelete: Cascade desde Product hacia Negocio."]
      ),
      createImpactItem(
        "productImages",
        "Imágenes de productos",
        productImagesCount,
        "delete",
        "indirect",
        ["Se eliminarían por cascada a través de Product -> Image."]
      ),
      createImpactItem(
        "productAttributes",
        "Atributos de productos",
        productAttributesCount,
        "delete",
        "indirect",
        ["Se eliminan por cascada a través de Product -> ProductAttribute."]
      ),
      createImpactItem(
        "productVariants",
        "Variantes de productos",
        productVariantsCount,
        "delete",
        "indirect",
        ["Se eliminan por cascada a través de Product -> ProductVariant."]
      ),
      createImpactItem(
        "services",
        "Servicios",
        servicesCount,
        "delete",
        "direct",
        ["Relacion directa con onDelete: Cascade desde Servicio hacia Negocio."]
      ),
      createImpactItem(
        "serviceMedia",
        "Multimedia de servicios",
        serviceMediaCount,
        "delete",
        "indirect",
        ["Se eliminaría por cascada a través de Servicio -> Media."]
      ),
      createImpactItem(
        "publications",
        "Publicaciones",
        publicationsCount,
        "delete",
        "direct",
        ["Publicacion.negocio usa onDelete: Cascade."]
      ),
      createImpactItem(
        "publicationMedia",
        "Multimedia de publicaciones",
        publicationMediaCount,
        "delete",
        "indirect",
        ["Se eliminaría por cascada a través de Publicacion -> Media."]
      ),
      createImpactItem(
        "reservations",
        "Reservas",
        reservationsCount,
        "delete",
        "direct",
        ["Reservation.negocio usa onDelete: Cascade."]
      ),
      createImpactItem(
        "availability",
        "Configuración de reservas",
        availabilityCount,
        "delete",
        "direct",
        ["BusinessAvailability.negocio usa onDelete: Cascade."]
      ),
      createImpactItem(
        "orders",
        "Órdenes",
        ordersCount,
        "delete",
        "direct",
        ["La purge propuesta las elimina explícitamente antes de remover el negocio."]
      ),
      createImpactItem(
        "orderItems",
        "Items de órdenes",
        orderItemsCount,
        "delete",
        "indirect",
        ["La purge propuesta los elimina explícitamente antes de borrar las órdenes."]
      ),
      createImpactItem(
        "orderStatusHistory",
        "Historial de estados de órdenes",
        orderStatusHistoryCount,
        "delete",
        "indirect",
        ["Se elimina explícitamente como parte del saneamiento de órdenes del negocio."]
      ),
      createImpactItem(
        "deliveryData",
        "Datos de entrega",
        deliveryDataCount,
        "delete",
        "indirect",
        ["Se elimina explícitamente después de desvincular y borrar las órdenes."]
      ),
      createImpactItem(
        "transactions",
        "Transacciones ligadas a órdenes",
        transactionsCount,
        "delete",
        "indirect",
        ["Se infieren de forma segura por Transaction -> Order y la purge propuesta las elimina explícitamente."]
      ),
      createImpactItem(
        "contacts",
        "Contactos CRM vinculados",
        contactsCount,
        "delete",
        "direct",
        ["Para purge de datos de prueba, la política elegida es borrarlos explícitamente en vez de dejar SetNull."]
      ),
      createImpactItem(
        "surveys",
        "Encuestas",
        surveysCount,
        "delete",
        "direct",
        ["La purge propuesta las elimina explícitamente junto con su cadena de feedback."]
      ),
      createImpactItem(
        "surveyQuestionLinks",
        "Vínculos encuesta-pregunta",
        surveyQuestionLinksCount,
        "delete",
        "indirect",
        ["Se eliminan explícitamente antes de borrar encuestas y preguntas propias del negocio."]
      ),
      createImpactItem(
        "surveyReviews",
        "Reseñas de encuestas",
        surveyReviewsCount,
        "delete",
        "indirect",
        ["Se eliminan explícitamente como parte del historial de encuestas del negocio de prueba."]
      ),
      createImpactItem(
        "surveyResponses",
        "Respuestas de reseñas",
        surveyResponsesCount,
        "delete",
        "indirect",
        ["Se eliminan explícitamente antes de borrar reseñas y encuestas."]
      ),
      createImpactItem(
        "businessOwnedQuestions",
        "Preguntas propias del negocio",
        businessOwnedQuestionsCount,
        "delete",
        "direct",
        ["Solo se consideran preguntas del negocio con creador NEGOCIO; no se tocan preguntas globales de ADMIN."]
      ),
      createImpactItem(
        "adminLinkedQuestions",
        "Preguntas ADMIN ligadas al negocio",
        adminLinkedQuestionsCount,
        "set_null",
        "direct",
        ["Se preservan y se desasocian del negocio poniendo negocioId en null."]
      ),
      createImpactItem(
        "externalBusinessQuestionLinks",
        "Preguntas propias ligadas a encuestas externas",
        externalBusinessQuestionLinksCount,
        "manual_review",
        "indirect",
        [
          "Hay preguntas del negocio conectadas a encuestas de otro negocio.",
          "La purge debe bloquearse hasta revisar esa reutilización para no romper integridad ni borrar preguntas compartidas por error.",
        ]
      ),
      createImpactItem(
        "follows",
        "Seguidores del negocio",
        followsCount,
        "delete",
        "direct",
        ["Follow.followedBusiness usa onDelete: Cascade."]
      ),
      createImpactItem(
        "catalogGroups",
        "Grupos de catálogo",
        catalogGroupsCount,
        "delete",
        "direct",
        ["CatalogGroup.negocio usa onDelete: Cascade."]
      ),
      createImpactItem(
        "catalogGroupProducts",
        "Asignaciones de grupos de catálogo",
        catalogGroupProductsCount,
        "delete",
        "indirect",
        ["Se eliminarían por cascada a través de CatalogGroup o Product."]
      ),
      createImpactItem(
        "negocioCategories",
        "Vínculos con categorías",
        negocioCategoriesCount,
        "delete",
        "direct",
        ["Solo se elimina la tabla pivote; las categorías globales se preservan."]
      ),
      createImpactItem(
        "negocioSections",
        "Vínculos con secciones",
        negocioSectionsCount,
        "delete",
        "direct",
        ["Solo se elimina la tabla pivote; las secciones globales se preservan."]
      ),
      createImpactItem(
        "ownerUser",
        "Usuario dueño",
        1,
        "preserve",
        "direct",
        ["El usuario propietario es global y no forma parte del purge del negocio."]
      ),
    ].filter((item) => item.count > 0);

    const blockers: string[] = [];
    const warnings: string[] = [];
    const notes: string[] = [
      "Este preview no ejecuta borrado ni modifica datos.",
      "Los conteos mostrados se basan solo en relaciones verificables y seguras del schema actual.",
      "La política actual de purge es exclusiva para negocios marcados como test y archivados previamente.",
    ];

    if (!business.isTestData) {
      blockers.push(
        "El negocio no está marcado como test. La purge profunda solo se permite para datos de prueba."
      );
    }

    if (!business.archivedAt) {
      blockers.push(
        "El negocio no está archivado. Primero debe archivarse antes de permitir una purge irreversible."
      );
    }

    if (externalBusinessQuestionLinksCount > 0) {
      blockers.push(
        `Se detectaron ${externalBusinessQuestionLinksCount} vínculos de preguntas propias del negocio con encuestas de otros negocios. La purge se bloquea hasta revisar esa reutilización.`
      );
    }

    if (adminLinkedQuestionsCount > 0) {
      warnings.push(
        `Se detectaron ${adminLinkedQuestionsCount} preguntas de ADMIN asociadas al negocio. Se preservarán y solo se desasociarán del negocio.`
      );
    }

    if (ordersCount > 0 || transactionsCount > 0) {
      warnings.push(
        "Se detectó historial comercial ligado al negocio. Aunque la purge propuesta lo puede resolver para test data, sigue siendo una operación sensible."
      );
    }

    if (productsCount > 0 || servicesCount > 0 || publicationsCount > 0) {
      warnings.push(
        "El negocio tiene contenido operativo y público asociado. La limpieza remota de assets/CDN no está incluida todavía."
      );
    }

    if (catalogGroupsCount > 0 || catalogGroupProductsCount > 0) {
      warnings.push(
        "Se detectó organización de catálogo propia del negocio. La purge depende de las cascadas claras y del orden prudente de borrado manual."
      );
    }

    if (transactionsCount !== 0 || deliveryDataCount !== 0) {
      notes.push(
        "Las transacciones y los datos de entrega se calculan desde las referencias directas de las órdenes para reflejar mejor el cleanup real del purge."
      );
    }

    notes.push(
      "Las categorías globales, secciones globales y el usuario dueño no forman parte del borrado."
    );
    notes.push(
      "Las preguntas de ADMIN/globales se preservan; si estaban asociadas al negocio, se prevé desasociarlas antes de borrar el negocio."
    );
    notes.push(
      "Los assets remotos en Cloudinary/S3/CDN no se cuentan aquí y deberán tratarse después de la purge en un paso separado."
    );

    const summary = impacts.reduce(
      (acc, item) => {
        acc.totalRelatedRecords += item.count;

        if (item.classification === "delete") acc.directDeleteCandidates += item.count;
        if (item.classification === "set_null") acc.setNullCandidates += item.count;
        if (item.classification === "manual_review") acc.manualReviewCandidates += item.count;
        if (item.classification === "preserve") acc.preserveCandidates += item.count;

        return acc;
      },
      {
        directDeleteCandidates: 0,
        setNullCandidates: 0,
        manualReviewCandidates: 0,
        preserveCandidates: 0,
        totalRelatedRecords: 0,
      }
    );

    const canDelete = blockers.length === 0;

    console.info(`[previewDeleteBusinessAction][${traceId}] Preview listo`, {
      businessId,
      canDelete,
      blockers: blockers.length,
      warnings: warnings.length,
      totalRelatedRecords: summary.totalRelatedRecords,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message: "Preview de eliminación generado correctamente.",
      data: {
        business,
        canDelete,
        blockers,
        warnings,
        notes,
        counts,
        impacts,
        summary,
      },
      error: null,
    };
  } catch (error) {
    console.error(`[previewDeleteBusinessAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      message: "No fue posible generar el preview de eliminación.",
      data: null,
      error: "No fue posible generar el preview de eliminación.",
    };
  }
}
