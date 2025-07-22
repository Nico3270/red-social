

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function SeccionPage({params}:Props) {
  const {id} = await params
  return (
    <div className="mt-40 ">
      <h1 className="text-center">Hello Page desde {id} sección</h1>
      <div className="flex ">

      </div>
    </div>
  );
}