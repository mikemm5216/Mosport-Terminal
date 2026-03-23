import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  // CEO MANDATE: Guarantee strict data contract even for missing features
  return NextResponse.json({ 
    success: true, 
    alerts: [], 
    count: 0,
    message: "Alert system inactive for this cycle."
  });
}
