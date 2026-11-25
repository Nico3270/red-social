import FeedComponent from "@/feed/componentes/FeedComponent";
import { initialData } from "@/seed/seed";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{
    categoria: string;
  }>;
}


export default async function CategoryPage({ params }: Props) {
  const { categoria } = await params;
  const category = initialData.categorias.find((item) => item.slug === categoria);
  if (!category) notFound();
  return (
    <div className="mt-1 sm:mt-10 w-full">
      <FeedComponent
        categoriaSlug={categoria}
        categoriaNombre={category.nombre}
        categoriaIconName={category.iconName}
        discoveryContext="category"
      />
    </div>
  );
}


