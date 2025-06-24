// app/blog/page.tsx

import { getArticlesInformation } from "@/blog/actions/getArticlesInformation";
import ShowBlogsPrincipal from "@/blog/componentes/ShowBlogsPrincipal";


export default async function BlogPrincipalPage() {
  const blogs = await getArticlesInformation();

  return (
    <div className="min-h-screen bg-gray-900">
      <ShowBlogsPrincipal blogs={blogs} />
    </div>
  );
}

export const revalidate = 36000; // Opcional: revalida cada hora