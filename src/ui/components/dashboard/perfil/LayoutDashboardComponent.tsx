// LayoutDashboardComponent.tsx
"use client";

import { useSidebarStore } from "@/store/sideBar/sideBar-store";
import React, { useState, useEffect } from "react";
import SideBarDashboard from "./SideBarDashboard";
import { TopBarDashBoard } from "./TopBarDashBoard";
import clsx from "clsx";

interface LayoutDashboardComponentProps {
  children: React.ReactNode;
}

const LayoutDashboardComponent: React.FC<LayoutDashboardComponentProps> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useSidebarStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setSidebarOpen(mobile ? false : true);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  if (!isMounted) {
    return (
      <div className="flex min-h-screen relative">
        <main className="mt-16 min-h-[calc(100vh-4rem)] bg-gray-100 p-4 flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen relative">
      <div
        className={clsx(
          "fixed top-0 left-0 h-full transition-all duration-300 ease-in-out bg-gray-800 z-10",
          isSidebarOpen ? "w-1/6 min-w-[200px]" : "w-16",
          isMobile && !isSidebarOpen && "hidden"
        )}
      >
        <SideBarDashboard />
      </div>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-10"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div
        className={clsx(
          "flex-1 transition-all duration-300 ease-in-out z-0",
          isMobile ? "ml-0" : isSidebarOpen ? "ml-[16.666%]" : "ml-16"
        )}
      >
        <div
          className={clsx(
            "fixed top-0 h-16 bg-white z-20 shadow-md",
            isMobile ? "left-0 right-0" : isSidebarOpen ? "left-[16.666%] right-0" : "left-16 right-0"
          )}
        >
          <TopBarDashBoard />
        </div>

        <main className="mt-16 min-h-[calc(100vh-4rem)] bg-gray-100 p-4">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutDashboardComponent;