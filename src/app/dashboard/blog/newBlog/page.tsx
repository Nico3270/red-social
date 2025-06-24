import { fetchSectionsNewBlog } from "@/blog/actions/fetchSectionsNewBlog";
import CreateNewBlog from "@/blog/componentes/CreateNewBlog";

export const dynamic = "force-dynamic";

const Page = async () => {
  const secciones = await fetchSectionsNewBlog();

  return (
    <div>
      <CreateNewBlog secciones={secciones}/>
    </div>
  );
};

export default Page;
