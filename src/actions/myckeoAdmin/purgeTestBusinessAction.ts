"use server";

import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";
import { deleteCloudinaryAssets } from "@/lib/cloudinary/deleteCloudinaryAssets";
import { previewDeleteBusinessAction } from "./previewDeleteBusinessAction";
import { collectBusinessAssetsForCleanup } from "./collectBusinessAssetsForCleanup";

export interface PurgeTestBusinessActionInput {
  businessId: string;
}

export interface PurgeTestBusinessActionResult {
  ok: boolean;
  message: string;
  data: {
    businessId: string;
    businessName: string;
    deletedCounts: Record<string, number>;
    explicitlyDeletedCounts: Record<string, number>;
    cascadeEstimatedCounts: Record<string, number>;
    preservedCounts: Record<string, number>;
    totalExplicitDeleted: number;
    totalCascadeEstimated: number;
    assetCleanup: {
      totalCandidates: number;
      attempted: number;
      deleted: number;
      alreadyMissing: number;
      failed: number;
      unresolved: number;
      pending: string[];
      sourceBreakdown: Record<string, number>;
    };
    warnings: string[];
    traceId: string;
  } | null;
  error: string | null;
}

function buildTraceId(): string {
  return `purge-test-business-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function normalizeBusinessId(value: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function sumCounts(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

export async function purgeTestBusinessAction(
  input: PurgeTestBusinessActionInput
): Promise<PurgeTestBusinessActionResult> {
  const traceId = buildTraceId();
  const startedAt = Date.now();

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        ok: false,
        message: "No autorizado.",
        data: null,
        error: "No autorizado.",
      };
    }

    if (session.user.role !== "super_admin") {
      return {
        ok: false,
        message: "No tienes permisos para ejecutar esta purge.",
        data: null,
        error: "No tienes permisos para ejecutar esta purge.",
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

    const preview = await previewDeleteBusinessAction({ businessId });

    if (!preview.ok || !preview.data) {
      return {
        ok: false,
        message: preview.message || "No fue posible validar el preview previo a la purge.",
        data: null,
        error: preview.error || "No fue posible validar el preview previo a la purge.",
      };
    }

    if (!preview.data.canDelete) {
      return {
        ok: false,
        message: "La purge no es segura todavía para este negocio.",
        data: null,
        error:
          preview.data.blockers[0] ||
          "La purge no es segura todavía para este negocio.",
      };
    }

    const previewData = preview.data;
    const assetCleanupWarnings: string[] = [];
    let assetCleanupPlan:
      | Awaited<ReturnType<typeof collectBusinessAssetsForCleanup>>
      | null = null;

    try {
      assetCleanupPlan = await collectBusinessAssetsForCleanup(businessId);
    } catch (error) {
      console.error(
        `[purgeTestBusinessAction][${traceId}] No se pudo recolectar metadata de assets`,
        {
          businessId,
          error,
        }
      );
      assetCleanupWarnings.push(
        "No fue posible recolectar metadata de assets remotos antes de la purge. La limpieza de Cloudinary quedó pendiente."
      );
    }

    console.info(`[purgeTestBusinessAction][${traceId}] Inicio`, {
      actorUserId: session.user.id,
      businessId,
      previewBlockers: previewData.blockers.length,
      previewWarnings: previewData.warnings.length,
      assetCandidates: assetCleanupPlan?.totalCandidates ?? 0,
      deletableAssets: assetCleanupPlan?.deletableAssets.length ?? 0,
      unresolvedAssets: assetCleanupPlan?.unresolvedAssets.length ?? 0,
    });

    const sqlData = await prisma.$transaction(async (tx) => {
      const business = await tx.negocio.findUnique({
        where: { id: businessId },
        select: {
          id: true,
          nombre: true,
          isTestData: true,
          archivedAt: true,
        },
      });

      if (!business) {
        throw new Error("El negocio no existe o ya no está disponible.");
      }

      if (!business.isTestData) {
        throw new Error(
          "La purge profunda solo está permitida para negocios marcados como test."
        );
      }

      if (!business.archivedAt) {
        throw new Error(
          "El negocio debe estar archivado antes de ejecutar una purge profunda."
        );
      }

      const surveyIds = (
        await tx.encuesta.findMany({
          where: { negocioId: businessId },
          select: { id: true },
        })
      ).map((item) => item.id);

      const reviewIds =
        surveyIds.length > 0
          ? (
              await tx.resena.findMany({
                where: { encuestaId: { in: surveyIds } },
                select: { id: true },
              })
            ).map((item) => item.id)
          : [];

      const businessQuestions = await tx.pregunta.findMany({
        where: {
          negocioId: businessId,
          creador: "NEGOCIO",
        },
        select: { id: true },
      });

      const adminQuestions = await tx.pregunta.findMany({
        where: {
          negocioId: businessId,
          creador: "ADMIN",
        },
        select: { id: true },
      });

      const orderRows = await tx.order.findMany({
        where: { negocioId: businessId },
        select: {
          id: true,
          deliveryDataId: true,
          transactionId: true,
        },
      });

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

      const externalBusinessQuestionLinksCount =
        businessQuestions.length > 0
          ? await tx.encuestaPregunta.count({
              where: {
                preguntaId: {
                  in: businessQuestions.map((item) => item.id),
                },
                encuesta: {
                  negocioId: {
                    not: businessId,
                  },
                },
              },
            })
          : 0;

      if (externalBusinessQuestionLinksCount > 0) {
        throw new Error(
          `La purge se abortó porque existen ${externalBusinessQuestionLinksCount} vínculos de preguntas propias con encuestas de otros negocios.`
        );
      }

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

      const transactionIds = Array.from(
        new Set(transactions.map((transaction) => transaction.id))
      );

      const explicitlyDeletedCounts: Record<string, number> = {};
      const preservedCounts: Record<string, number> = {};

      if (adminQuestions.length > 0) {
        const updated = await tx.pregunta.updateMany({
          where: {
            id: { in: adminQuestions.map((item) => item.id) },
          },
          data: {
            negocioId: null,
          },
        });

        preservedCounts.adminQuestionsDetached = updated.count;
      } else {
        preservedCounts.adminQuestionsDetached = 0;
      }

      if (reviewIds.length > 0) {
        const deletedResponses = await tx.respuesta.deleteMany({
          where: {
            resenaId: { in: reviewIds },
          },
        });
        explicitlyDeletedCounts.surveyResponses = deletedResponses.count;

        const deletedReviews = await tx.resena.deleteMany({
          where: {
            id: { in: reviewIds },
          },
        });
        explicitlyDeletedCounts.surveyReviews = deletedReviews.count;
      } else {
        explicitlyDeletedCounts.surveyResponses = 0;
        explicitlyDeletedCounts.surveyReviews = 0;
      }

      if (surveyIds.length > 0) {
        const deletedSurveyQuestionLinks = await tx.encuestaPregunta.deleteMany({
          where: {
            encuestaId: { in: surveyIds },
          },
        });
        explicitlyDeletedCounts.surveyQuestionLinks = deletedSurveyQuestionLinks.count;

        const deletedSurveys = await tx.encuesta.deleteMany({
          where: {
            id: { in: surveyIds },
          },
        });
        explicitlyDeletedCounts.surveys = deletedSurveys.count;
      } else {
        explicitlyDeletedCounts.surveyQuestionLinks = 0;
        explicitlyDeletedCounts.surveys = 0;
      }

      if (businessQuestions.length > 0) {
        const deletedBusinessQuestions = await tx.pregunta.deleteMany({
          where: {
            id: { in: businessQuestions.map((item) => item.id) },
          },
        });
        explicitlyDeletedCounts.businessOwnedQuestions =
          deletedBusinessQuestions.count;
      } else {
        explicitlyDeletedCounts.businessOwnedQuestions = 0;
      }

      const deletedContacts = await tx.contactos.deleteMany({
        where: {
          negocioId: businessId,
        },
      });
      explicitlyDeletedCounts.contacts = deletedContacts.count;

      if (orderIds.length > 0) {
        await tx.order.updateMany({
          where: {
            id: { in: orderIds },
          },
          data: {
            transactionId: null,
            deliveryDataId: null,
          },
        });

        if (transactionIds.length > 0) {
          await tx.transaction.updateMany({
            where: {
              id: { in: transactionIds },
            },
            data: {
              orderId: null,
            },
          });
        }

        const deletedStatusHistory = await tx.orderStatusHistory.deleteMany({
          where: {
            orderId: { in: orderIds },
          },
        });
        explicitlyDeletedCounts.orderStatusHistory = deletedStatusHistory.count;

        const deletedOrderItems = await tx.orderItem.deleteMany({
          where: {
            orderId: { in: orderIds },
          },
        });
        explicitlyDeletedCounts.orderItems = deletedOrderItems.count;

        const deletedOrders = await tx.order.deleteMany({
          where: {
            id: { in: orderIds },
          },
        });
        explicitlyDeletedCounts.orders = deletedOrders.count;
      } else {
        explicitlyDeletedCounts.orderStatusHistory = 0;
        explicitlyDeletedCounts.orderItems = 0;
        explicitlyDeletedCounts.orders = 0;
      }

      if (deliveryDataIds.length > 0) {
        const deletedDeliveryData = await tx.deliveryData.deleteMany({
          where: {
            id: { in: deliveryDataIds },
          },
        });
        explicitlyDeletedCounts.deliveryData = deletedDeliveryData.count;
      } else {
        explicitlyDeletedCounts.deliveryData = 0;
      }

      if (transactionIds.length > 0) {
        const deletedTransactions = await tx.transaction.deleteMany({
          where: {
            id: { in: transactionIds },
          },
        });
        explicitlyDeletedCounts.transactions = deletedTransactions.count;
      } else {
        explicitlyDeletedCounts.transactions = 0;
      }

      const deletedBusiness = await tx.negocio.delete({
        where: {
          id: businessId,
        },
        select: {
          id: true,
          nombre: true,
        },
      });

      explicitlyDeletedCounts.business = 1;

      const cascadeEstimatedCounts = {
        products: previewData.counts.products,
        productImages: previewData.counts.productImages,
        productAttributes: previewData.counts.productAttributes,
        productVariants: previewData.counts.productVariants,
        services: previewData.counts.services,
        serviceMedia: previewData.counts.serviceMedia,
        publications: previewData.counts.publications,
        publicationMedia: previewData.counts.publicationMedia,
        reservations: previewData.counts.reservations,
        availability: previewData.counts.availability,
        follows: previewData.counts.follows,
        catalogGroups: previewData.counts.catalogGroups,
        catalogGroupProducts: previewData.counts.catalogGroupProducts,
        negocioCategories: previewData.counts.negocioCategories,
        negocioSections: previewData.counts.negocioSections,
      };

      const deletedCounts = {
        ...explicitlyDeletedCounts,
        ...cascadeEstimatedCounts,
      };

      return {
        businessId: deletedBusiness.id,
        businessName: deletedBusiness.nombre,
        deletedCounts,
        explicitlyDeletedCounts,
        cascadeEstimatedCounts,
        preservedCounts: {
          ownerUser: 1,
          adminQuestionsDetached: preservedCounts.adminQuestionsDetached,
        },
        totalExplicitDeleted: sumCounts(explicitlyDeletedCounts),
        totalCascadeEstimated: sumCounts(cascadeEstimatedCounts),
      };
    });

    let assetCleanupSummary = {
      totalCandidates: assetCleanupPlan?.totalCandidates ?? 0,
      attempted: 0,
      deleted: 0,
      alreadyMissing: 0,
      failed: 0,
      unresolved: assetCleanupPlan?.unresolvedAssets.length ?? 0,
      pending: assetCleanupPlan?.unresolvedAssets
        .slice(0, 10)
        .map((asset) => `${asset.source}: ${asset.url}`) ?? [],
      sourceBreakdown: assetCleanupPlan?.sourceBreakdown ?? {},
    };

    if (assetCleanupPlan?.deletableAssets.length) {
      try {
        const cleanupResult = await deleteCloudinaryAssets(
          assetCleanupPlan.deletableAssets
        );

        assetCleanupSummary = {
          ...assetCleanupSummary,
          attempted: cleanupResult.attempted,
          deleted: cleanupResult.deleted,
          alreadyMissing: cleanupResult.alreadyMissing,
          failed: cleanupResult.failed,
          pending: [
            ...assetCleanupSummary.pending,
            ...cleanupResult.failedAssets
              .slice(0, 10)
              .map(
                (failure) =>
                  `${failure.asset.resourceType}:${failure.asset.publicId} - ${failure.error}`
              ),
          ].slice(0, 20),
        };

        if (cleanupResult.failed > 0) {
          assetCleanupWarnings.push(
            `La limpieza remota de Cloudinary dejó ${cleanupResult.failed} asset(s) pendientes para revisión manual.`
          );
        }

        if (assetCleanupPlan.unresolvedAssets.length > 0) {
          assetCleanupWarnings.push(
            `Quedaron ${assetCleanupPlan.unresolvedAssets.length} asset(s) sin metadata confiable para borrado remoto automático.`
          );
        }

        console.info(`[purgeTestBusinessAction][${traceId}] Cleanup Cloudinary`, {
          businessId,
          attempted: cleanupResult.attempted,
          deleted: cleanupResult.deleted,
          alreadyMissing: cleanupResult.alreadyMissing,
          failed: cleanupResult.failed,
          unresolved: assetCleanupPlan.unresolvedAssets.length,
        });
      } catch (error) {
        console.error(
          `[purgeTestBusinessAction][${traceId}] Error en cleanup remoto post-commit`,
          {
            businessId,
            error,
          }
        );
        assetCleanupWarnings.push(
          "El purge SQL se completó, pero el cleanup remoto en Cloudinary falló por completo y requiere revisión manual."
        );
        assetCleanupSummary = {
          ...assetCleanupSummary,
          attempted: assetCleanupPlan.deletableAssets.length,
          failed: assetCleanupPlan.deletableAssets.length,
          pending: [
            ...assetCleanupSummary.pending,
            ...assetCleanupPlan.deletableAssets
              .slice(0, 10)
              .map((asset) => `${asset.resourceType}:${asset.publicId}`),
          ].slice(0, 20),
        };
      }
    } else if (assetCleanupPlan && assetCleanupPlan.unresolvedAssets.length > 0) {
      assetCleanupWarnings.push(
        `No se intentó borrar ningún asset remoto porque los ${assetCleanupPlan.unresolvedAssets.length} detectados no tenían metadata Cloudinary confiable.`
      );
    }

    console.info(`[purgeTestBusinessAction][${traceId}] Purge OK`, {
      businessId: sqlData.businessId,
      businessName: sqlData.businessName,
      totalExplicitDeleted: sqlData.totalExplicitDeleted,
      totalCascadeEstimated: sqlData.totalCascadeEstimated,
      explicitlyDeletedCounts: sqlData.explicitlyDeletedCounts,
      cascadeEstimatedCounts: sqlData.cascadeEstimatedCounts,
      preservedCounts: sqlData.preservedCounts,
      assetCleanupSummary,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: true,
      message: "Negocio de prueba purgado correctamente.",
      data: {
        ...sqlData,
        assetCleanup: assetCleanupSummary,
        warnings: [
          assetCleanupSummary.attempted > 0
            ? "El cleanup remoto de Cloudinary se ejecutó después del commit SQL."
            : "No se ejecutó cleanup remoto automático porque no había assets Cloudinary borrables con metadata confiable.",
          "Las preguntas de ADMIN se preservaron y se desasociaron del negocio antes de borrar el registro principal.",
          "Los conteos de cascada son estimaciones consistentes con el preview; los conteos explícitos corresponden a deleteMany/updateMany ejecutados dentro de la transacción.",
          ...assetCleanupWarnings,
        ],
        traceId,
      },
      error: null,
    };
  } catch (error) {
    console.error(`[purgeTestBusinessAction][${traceId}] Error inesperado`, {
      error,
      elapsedMs: Date.now() - startedAt,
    });

    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No fue posible ejecutar la purge del negocio de prueba.",
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No fue posible ejecutar la purge del negocio de prueba.",
    };
  }
}
