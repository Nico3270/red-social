import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { unstable_noStore as noStore } from "next/cache";
import { allowDemoRequest, findValidDemo } from "@/lib/onboarding/demo-access";
import { DEMO_COOKIE, readDemoSession } from "@/lib/onboarding/demo-security";
import { demoSnapshotSchema } from "@/lib/onboarding/contracts";
import BusinessDemoProfile from "@/ui/components/onboarding/BusinessDemoProfile";
import DemoBootstrap from "./DemoBootstrap";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Demostración privada | Myckeo",
  robots: { index: false, follow: false, noarchive: true },
};
export default async function BusinessDemoPage() {
  noStore();
  const token = readDemoSession((await cookies()).get(DEMO_COOKIE)?.value);
  const demo =
    token && (await allowDemoRequest(await headers()))
      ? await findValidDemo(token)
      : null;
  const snapshot = demo ? demoSnapshotSchema.safeParse(demo.snapshot) : null;
  return (
    <main className="min-h-screen bg-slate-100 p-3 sm:p-8">
      <div className="mx-auto mb-5 max-w-5xl rounded-xl bg-sky-50 p-4 text-sky-950">
        <p className="font-semibold">Demostración privada · Solo lectura</p>
        <p className="text-sm">
          Este enlace no activa una cuenta ni publica el negocio. El receptor
          puede reenviarlo.
        </p>
      </div>
      <DemoBootstrap>
        {snapshot?.success && snapshot.data.businessId === demo?.negocioId ? (
          <BusinessDemoProfile business={snapshot.data} />
        ) : (
          <p className="mx-auto max-w-xl rounded-xl bg-white p-6 text-center">
            Abre el enlace de demostración que te compartió Myckeo. Si no está
            disponible, solicita uno nuevo.
          </p>
        )}
      </DemoBootstrap>
    </main>
  );
}
