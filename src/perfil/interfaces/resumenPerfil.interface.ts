// app/interfaces/resumenPerfil.interface.ts
// Interfaz para el resumen del perfil de un negocio, se recibe la cantidad de productos, publicaciones, servicios y reseñas y se pueden agregar más campos si es necesario


export interface ResumenPerfil {
  productos: number; // Conteo de productos disponibles
  publicaciones: number; // Conteo de publicaciones disponibles
  servicios: number; // Conteo de servicios disponibles
  reseñas: number; // Conteo de reseñas disponibles
}