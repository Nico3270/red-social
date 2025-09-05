import { auth } from "@/auth.config";
import FeedComponent from "@/feed/componentes/FeedComponent";


export default async function PerfilPage() {
    const session = await auth();
    // Validación simple, se comprueba antes con mas rigurosidad en el layout
    if (!session?.user) {
        return (
            <h1 className="mt-40">No estas autenticado</h1>
        )
    }
    return (
        <div className="mt-0  flex sm:flex-col items-center justify-center">
            <pre>{JSON.stringify(session.user, null, 2)}</pre>     
            <FeedComponent />

        </div>
    );
}