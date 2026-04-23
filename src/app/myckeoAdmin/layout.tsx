import { auth } from "@/auth.config";
import { redirect } from "next/navigation";
import React from "react";

export default async function MyckeoAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  if (session.user.role !== "super_admin") {
    redirect("/not_authorized");
  }

  return (
    <main className="min-h-screen bg-white">
      {children}
    </main>
  );
}
