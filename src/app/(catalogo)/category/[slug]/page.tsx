import FeedComponent from "@/feed/componentes/FeedComponent";
import { initialData } from "@/seed/seed";

interface Props {
    params: Promise<
        { slug: string; }>
}

const formatCategoryName = (slug: string) =>
  slug
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export default async function CategoryPage({ params }: Props) {
    const { slug } = await params;
    const category = initialData.categorias.find((item) => item.slug === slug);

    return (
        <div className="min-h-screen bg-gray-50 mb-20">
            <FeedComponent
                categoriaSlug={slug}
                categoriaNombre={category?.nombre || formatCategoryName(slug)}
                categoriaIconName={category?.iconName}
                discoveryContext="category"
            />
        </div>
    );
}
