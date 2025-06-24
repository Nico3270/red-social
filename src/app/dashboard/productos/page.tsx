import ModifyProductsList from "@/productos/components/ModifyProductsList";


export default function ProductsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Administrar Productos</h1>
      <ModifyProductsList />
    </div>
  );
}
