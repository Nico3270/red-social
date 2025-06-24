"use client"

import React from "react";
import Link from "next/link";
import { Card, CardContent, Typography, Badge, Box } from "@mui/material";
import { styled} from "@mui/system";

interface Section {
  titulo: string;
  descripcion: string;
  icono: React.ReactNode;
  url: string;
  habilitado: boolean;
  alertCount?: number;
}

interface Props {
  sections: Section[];
}

// Estilizado del Card con hover
const StyledCard = styled(Card)(() => ({
  transition: "transform 0.3s ease, box-shadow 0.3s ease",
  "&:hover": {
    transform: "translateY(-5px)",
    boxShadow: "0px 6px 15px rgba(0, 0, 0, 0.2)",


  },
  "&.disabled": {
    opacity: 0.6,
    pointerEvents: "none",
  },
}));

const DashboardSections: React.FC<Props> = ({ sections }) => {
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {sections.map((section, index) => (
        <Link href={section.url} key={index} passHref>
          <StyledCard className={section.habilitado ? "" : "disabled"}>
            <CardContent className="flex flex-col items-center text-center space-y-4 p-8">
              <Badge
                badgeContent={section.alertCount}
                color="error"
                invisible={!section.alertCount}
              >
                <Box>{section.icono}</Box>
              </Badge>

              <Typography
                variant="h5"
                className="font-bold"
                color={section.habilitado ? "textPrimary" : "textSecondary"}
              >
                {section.titulo}
              </Typography>

              <Typography variant="body2" color="textSecondary">
                {section.descripcion}
              </Typography>

              {!section.habilitado && (
                <Typography variant="caption" color="error">
                  Sección deshabilitada temporalmente
                </Typography>
              )}
            </CardContent>
          </StyledCard>
        </Link>
      ))}
    </div>
  );
};

export default DashboardSections;
