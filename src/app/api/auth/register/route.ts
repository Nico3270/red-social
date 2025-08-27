import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function POST(request: Request) {
  try {
    // Recibimos todos los campos requeridos según el schema
    const {
      nombre,
      apellido,
      username,
      email,
      password,
      ciudad,
      departamento,
      genero,
      fechaNacimiento,
    } = await request.json();

    // Validamos que vengan
    if (
      !nombre ||
      !apellido ||
      !username ||
      !email ||
      !password ||
      !ciudad ||
      !departamento ||
      !genero ||
      !fechaNacimiento
    ) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Validamos si el email ya existe
    const existingUser = await prisma.usuario.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El usuario ya existe con ese correo" },
        { status: 400 }
      );
    }

    // Encriptamos contraseña
    const hashedPassword = bcryptjs.hashSync(password, 10);

    // Creamos usuario
    const newUser = await prisma.usuario.create({
      data: {
        nombre,
        apellido,
        username,
        email,
        ciudad,
        departamento,
        genero,
        fechaNacimiento: new Date(fechaNacimiento), // convertir a Date
        contraseña: hashedPassword,
        role: "user",
      },
    });

    // No devolver la contraseña al cliente
    const { contraseña, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
