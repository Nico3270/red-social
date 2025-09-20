import FeedComponent from "@/feed/componentes/FeedComponent";

interface Props {
    params: Promise<
        { slug: string; }>
}




export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    // Vamos a obtener las preguntas del negocio
    return (
        <div className="min-h-screen bg-gray-50 sm:mt-60 mb-20">
            <FeedComponent categoriaSlug={slug} />
        </div>
    );
}