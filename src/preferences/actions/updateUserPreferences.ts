// src/actions/user/updatePreferences.ts
'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth.config';

interface UpdatePreferencesProps {
  ciudad: string;
  departamento: string;
  preferencias: string[];
}

export async function updateUserPreferences({ ciudad, departamento, preferencias }: UpdatePreferencesProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: 'Usuario no autenticado' };
  }

  try {
    await prisma.usuario.update({
      where: { id: session.user.id },
      data: { ciudad, departamento, preferencias },
    });
    return { ok: true, message: 'Preferencias actualizadas' };
  } catch (error) {
    console.error('Error actualizando preferencias:', error);
    return { ok: false, message: 'Error al actualizar' };
  }
}