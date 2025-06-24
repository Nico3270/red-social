import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { message: "El correo ya está registrado" },
        { status: 400 }
      );
    }

    const hashedPassword = bcryptjs.hashSync(password, 10);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: "user" },
    });

    return NextResponse.json(
      { message: "Usuario creado exitosamente", user: newUser },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return NextResponse.json(
      { message: "Ocurrió un error al registrar el usuario" },
      { status: 500 }
    );
  }
}
