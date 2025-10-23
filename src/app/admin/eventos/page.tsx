import BrevoSyncForm from "@/admin/componentes/BrevoSyncForm";


export default function BrevoPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-neutral-900 dark:to-neutral-950">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-neutral-800 dark:text-neutral-100">
          Panel de Sincronización Brevo
        </h1>
        <BrevoSyncForm />
      </div>
    </div>
  );
}
