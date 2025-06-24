"use server"

// app/actions/getUsersInformation.ts
import prisma from "@/lib/prisma";

export async function getUsersInformation() {
  return await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
