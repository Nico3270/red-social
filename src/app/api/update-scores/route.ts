// app/api/update-scores/route.ts
import { updatePublicationOrders } from '@/lib/updateScores';
import { NextResponse } from 'next/server';


export async function GET() {
  try {
    const result = await updatePublicationOrders();
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error) {
    console.error('Error en API update-scores:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}