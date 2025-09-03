// src/actions/follow/checkIsFollowing.ts (actualizado)
"use server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth.config";
import { revalidatePath } from "next/cache";
import { FollowType, Prisma } from "@prisma/client"; // Import Prisma para tipos generados

// Check ajustado para fields separados
interface CheckParams {
  followerId: string;
  followedId: string;
  type: FollowType;
}

export async function checkIsFollowing(params: CheckParams) {
  const { followerId, followedId, type } = params;
  let whereClause;
  if (type === "USER_TO_BUSINESS") {
    whereClause = {
      followerId_followedBusinessId: {
        followerId,
        followedBusinessId: followedId,
      },
    };
  } else {
    whereClause = {
      followerId_followedUserId: { followerId, followedUserId: followedId },
    };
  }
  const existing = await prisma.follow.findUnique({
    where: whereClause,
    select: { id: true },
  });
  return !!existing;
}

// Toggle ajustado para fields separados, con tipado explícito
interface ToggleParams {
  followedId: string;
  type: FollowType;
}

export async function toggleFollow(params: ToggleParams) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Usuario no autenticado.");

  const followerId = session.user.id;
  const { followedId, type } = params;

  // Validación existencia
  if (type === "USER_TO_BUSINESS") {
    const exists = await prisma.negocio.findUnique({
      where: { id: followedId },
    });
    if (!exists) throw new Error("Negocio no encontrado.");
  } else {
    const exists = await prisma.usuario.findUnique({
      where: { id: followedId },
    });
    if (!exists) throw new Error("Usuario no encontrado.");
  }

  return prisma
    .$transaction(async (tx) => {
      let whereClause;
      if (type === "USER_TO_BUSINESS") {
        whereClause = {
          followerId_followedBusinessId: {
            followerId,
            followedBusinessId: followedId,
          },
        };
      } else {
        whereClause = {
          followerId_followedUserId: { followerId, followedUserId: followedId },
        };
      }

      const existing = await tx.follow.findUnique({ where: whereClause });

      if (existing) {
        await tx.follow.delete({ where: { id: existing.id } });
        return { action: "unfollowed", followed: false };
      } else {
        // Tipado explícito con Prisma.FollowCreateInput (resuelve inferencia estrecha)
        const data: Prisma.FollowCreateInput = {
          follower: { connect: { id: followerId } }, // Connect para relación
          type,
          // Condicional inline para fields opcionales (elegante e inmutable)
          ...(type === "USER_TO_BUSINESS"
            ? { followedBusiness: { connect: { id: followedId } } } // Connect para FK
            : { followedUser: { connect: { id: followedId } } }),
        };
        await tx.follow.create({ data });
        return { action: "followed", followed: true };
      }
    })
    .then((result) => {
      revalidatePath("/feed");
      revalidatePath(`/perfil/${followedId}`);
      return result;
    })
    .catch((error) => {
      console.error("Error en toggleFollow:", error);
      throw new Error("Error al procesar el seguimiento.");
    });
}