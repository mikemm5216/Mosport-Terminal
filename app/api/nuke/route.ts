import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * [TEMP] Database Nuke Route
 * This route wipes the public schema and recreates it.
 * WARNING: DESTRUCTIVE OPERATION.
 */
export async function GET() {
  try {
    console.error("!!! DATABASE NUKE TRIGGERED !!!");
    
    // 執行毀滅性 SQL
    await prisma.$executeRawUnsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    
    return NextResponse.json({ 
      message: "DATABASE WIPED SUCCESSFULLY",
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("[NUKE ERROR]", error.message);
    return NextResponse.json({ 
      error: "FAILED TO WIPE DATABASE", 
      details: error.message 
    }, { status: 500 });
  }
}

// 同時支援 POST 以防前端需求
export async function POST() {
  return GET();
}
