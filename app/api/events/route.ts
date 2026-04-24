import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ success: false, message: "Legacy V1 events endpoint deprecated" }, { status: 410 });
}
