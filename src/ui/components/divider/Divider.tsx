import { Box, Typography } from "@mui/material";

export default function Divider() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 1,
        width: "100%",
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: "1px", // Asegura que sea exactamente 1px
          backgroundColor: "grey.400", // Un tono un poco más oscuro para mayor visibilidad
        }}
      />
      <Typography
        sx={{
          px: 2,
          fontSize: 18,
          color: "grey.500",
          fontWeight: 500,
          userSelect: "none",
        }}
      >
        •••
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: "1px", // Igual que la línea izquierda
          backgroundColor: "grey.400",
        }}
      />
    </Box>
  );
}
