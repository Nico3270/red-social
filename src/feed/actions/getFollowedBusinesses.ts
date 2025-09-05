// src/actions/feed/getFollowedBusinesses.ts
"use server";
import { auth } from "@/auth.config";
import prisma from "@/lib/prisma";

export async function getFollowedBusinesses() {
  const session = await auth();
  if (!session?.user?.id) return { followedBusinessIds: [] };

  const follows = await prisma.follow.findMany({
    where: { followerId: session.user.id, type: "USER_TO_BUSINESS" },
    select: { followedBusinessId: true },
  });

  const followedBusinessIds = follows
    .map(f => f.followedBusinessId)
    .filter((id): id is string => !!id); // Type guard: infiere string[]

  return { followedBusinessIds };
}