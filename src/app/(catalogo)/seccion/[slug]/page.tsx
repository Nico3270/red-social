interface Props {
  params: Promise<{
    seccion: string;
  }>;
}

export default async function SeccionPage({ params }: Props) {
  const { seccion } = await params;
  return (
    <div className="sm:mt-60">
      <h1>Hello Page</h1>
    </div>
  );
}