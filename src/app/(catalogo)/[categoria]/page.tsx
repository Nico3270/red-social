import FeedComponent from "@/feed/componentes/FeedComponent";

interface Props {
  params: Promise<{
    categoria: string;
  }>;
}


export default async function CategoryPage({ params }: Props) {
    const { categoria } = await params;
  return (
    <div className="mt-1 sm:mt-10 w-full">
      <FeedComponent categoriaSlug={categoria} />
    </div>
  );
}


