import FeedComponent from "@/feed/componentes/FeedComponent";
import { initialData } from "@/seed/seed";
import { notFound } from "next/navigation";

interface Props {
    params: Promise<
        { slug: string; }>
}

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const category = initialData.categorias.find((item) => item.slug === slug);
    if (!category) notFound();

    return (
        <div className="min-h-screen bg-gray-50 mb-20">
            <FeedComponent
                categoriaSlug={slug}
                categoriaNombre={category.nombre}
                categoriaIconName={category.iconName}
                discoveryContext="category"
            />
        </div>
    );
}
