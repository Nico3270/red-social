import { useSidebarStore } from "@/store/sideBar/sideBar-store";

export default function FixtureSidebar() {
  return (
    <aside className="fixture-sidebar" aria-hidden="true">
      <b>Myckeo</b>
      <p>Tu negocio</p>
      <p className="active">Productos</p>
    </aside>
  );
}
export function TopBarDashBoard() {
  const { isSidebarOpen, setSidebarOpen } = useSidebarStore();
  return (
    <div className="fixture-topbar">
      <button
        type="button"
        aria-label="Alternar menú del dashboard"
        onClick={() => setSidebarOpen(!isSidebarOpen)}
      >
        ☰
      </button>
      <span>Mi negocio · Catálogo simulado</span>
    </div>
  );
}
