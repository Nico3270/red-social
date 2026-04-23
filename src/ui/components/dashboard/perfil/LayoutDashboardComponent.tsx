// LayoutDashboardComponent.tsx
"use client";

import {
  isAllowedRestrictedDashboardPath,
} from "@/lib/business/businessSessionState";
import { useSidebarStore } from "@/store/sideBar/sideBar-store";
import React, { useState, useEffect } from "react";
import SideBarDashboard from "./SideBarDashboard";
import { TopBarDashBoard } from "./TopBarDashBoard";
import { Box } from "@mui/material";
import { usePathname } from "next/navigation";
import ArchivedBusinessDashboardState from "./ArchivedBusinessDashboardState";

interface LayoutDashboardComponentProps {
  children: React.ReactNode;
  businessRestricted?: boolean;
  businessName?: string | null;
  businessRestrictionReason?: string | null;
  businessArchivedAt?: string | null;
}

const LayoutDashboardComponent: React.FC<LayoutDashboardComponentProps> = ({
  children,
  businessRestricted = false,
  businessName = null,
  businessRestrictionReason = null,
  businessArchivedAt = null,
}) => {
  const { isSidebarOpen, setSidebarOpen } = useSidebarStore();
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const canRenderRestrictedRoute = isAllowedRestrictedDashboardPath(pathname);

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
      <Box sx={{ display: "flex", minHeight: "100vh", overflowX: "hidden" }}>
        <Box component="main" sx={{ mt: "4rem", flex: 1, bgcolor: "grey.100", p: { xs: 2, sm: 3, md: 4 }, overflowX: "hidden" }}>
          {children}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", overflowX: "hidden", zIndex: 30 }}>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100%",
          transition: "width 0.3s ease-in-out",
          bgcolor: "grey.800",
          zIndex: 11, // Increased zIndex to stack above the overlay
          width: isSidebarOpen ? { xs: "60%", sm: "250px" } : "4rem",
          display: isMobile && !isSidebarOpen ? "none" : "block",
          
        }}
      >
        <SideBarDashboard />
      </Box>

      {isMobile && isSidebarOpen && (
        <Box
          sx={{ position: "fixed", inset: 0, bgcolor: "rgba(0,0,0,0.4)", zIndex: 10 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Box
        sx={{
          flex: 1,
          transition: "margin-left 0.3s ease-in-out",
          ml: isMobile ? 0 : isSidebarOpen ? { xs: 0, sm: "200px" } : "4rem",
          overflowX: "hidden", // Evita overflow horizontal global
        }}
      >
        <Box
          sx={{
            position: "fixed",
            top: 0,
            height: "4rem",
            bgcolor: "white",
            zIndex: 20,
            boxShadow: "md",
            left: isMobile ? 0 : isSidebarOpen ? "200px" : "4rem",
            right: 0,
          }}
        >
          <TopBarDashBoard />
        </Box>

        <Box component="main" sx={{ mt: "4rem", minHeight: "calc(100vh - 4rem)", bgcolor: "grey.100", p: { xs: 2, sm: 3, md: 4 }, overflowX: "hidden" }}>
          {businessRestricted && !canRenderRestrictedRoute ? (
            <ArchivedBusinessDashboardState
              businessName={businessName}
              reason={businessRestrictionReason}
              archivedAt={businessArchivedAt}
            />
          ) : (
            <>
              {businessRestricted && canRenderRestrictedRoute && pathname !== "/dashboard" ? (
                <div className="mb-4">
                  <ArchivedBusinessDashboardState
                    businessName={businessName}
                    reason={businessRestrictionReason}
                    archivedAt={businessArchivedAt}
                    compact
                  />
                </div>
              ) : null}
              {children}
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default LayoutDashboardComponent;
