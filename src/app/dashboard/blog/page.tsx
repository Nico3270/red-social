import { getBlogList } from "@/blog/actions/getBlogList";
import BlogList from "@/blog/componentes/BlogList";

export const dynamic = "force-dynamic"; // Asegura que la acción no use caché
const Page = async () => {
  const blogs = await getBlogList();
  return <BlogList blogs={blogs} />;
};

export default Page;
