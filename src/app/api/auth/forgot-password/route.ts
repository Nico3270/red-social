// app/api/auth/forgot-password/route.ts
import { randomUUID } from 'crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getResetPasswordEmail } from '@/lib/templates/resetPasswordEmail';
import { sendEmail } from '@/lib/email-forgot-password';


// === RATE LIMITING (3 solicitudes por hora por IP + email) ===
const redis = Redis.fromEnv();
const ratelimitIP = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
});

const ratelimitEmail = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'),
});

export async function POST(req: NextRequest) {
  try {
    // Obtención segura de IP en entornos como Vercel
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'anonymous';

    const { email } = await req.json();

    // Validar entrada
    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json(
        { ok: false, message: 'Ingresa un correo válido.' },
        { status: 400 }
      );
    }

    // Rate limit por IP
    const { success: ipAllowed } = await ratelimitIP.limit(ip);
    if (!ipAllowed) {
      return NextResponse.json(
        { ok: false, message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429 }
      );
    }

    // Rate limit por email
    const { success: emailAllowed } = await ratelimitEmail.limit(email.toLowerCase());
    if (!emailAllowed) {
      return NextResponse.json(
        { ok: false, message: 'Ya enviamos un enlace a este correo. Revisa tu bandeja.' },
        { status: 429 }
      );
    }

    // Buscar usuario (incluyendo nombre para personalizar email)
    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, nombre: true },
    });

    // === MENSAJE GENÉRICO: NO REVELAR SI EXISTE ===
    const genericSuccess = {
      ok: true,
      message: 'Si el correo está registrado, recibirás un enlace de recuperación.',
    };

    if (!user) {
      // Simular delay para evitar timing attacks
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json(genericSuccess);
    }

    // === INVALIDAR TOKENS ANTERIORES ===
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: { used: true },
    });

    // === CREAR NUEVO TOKEN ===
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // === ENVIAR EMAIL CON BREVO ===
    const resetUrl = `https://myckeo.com/auth/reset-password/${token}`;
    const htmlContent = getResetPasswordEmail({
      name: user.nombre || '',
      resetUrl,
    });

    try {
      await sendEmail({
        toEmail: email,
        toName: user.nombre || '',
        subject: 'Recupera tu contraseña en Myckeo',
        htmlContent,
      });
    } catch (emailError) {
      console.error('Error enviando email de recuperación:', emailError);
      // NO fallar el flujo: el token ya está creado, el usuario puede solicitar de nuevo
    }

    return NextResponse.json(genericSuccess);
  } catch (error) {
    console.error('Error en forgot-password:', error);
    return NextResponse.json(
      { ok: false, message: 'Error interno. Intenta de nuevo.' },
      { status: 500 }
    );
  }
}