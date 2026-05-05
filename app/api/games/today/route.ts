import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const matches = await prisma.match.findMany({
      where: {
        match_date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        predictions: {
          where: { label: "COACH_READ" },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const results = matches.map(m => {
      const prediction = m.predictions[0];
      return prediction?.payload || null;
    }).filter(Boolean);

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
