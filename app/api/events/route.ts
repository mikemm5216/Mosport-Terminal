import { NextResponse } from 'next/server';
import { db } from '../../../lib/db';
import { ContextEventSchema } from '../../../lib/validator';
import { applyEventModifiers } from '../../../engines/eventEngine';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const valid = ContextEventSchema.parse({
      team_id: body.team_id,
      match_id: body.match_id,
      event_type: body.event_type,
      impact_score: Number(body.impact_score)
    });

    const newEvent = await db.events.create({
      data: valid
    });

    // Immediately process event
    await applyEventModifiers(valid.team_id, [newEvent]);

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error: any) {
    return NextResponse.json({ success: false, event: null });
  }
}
