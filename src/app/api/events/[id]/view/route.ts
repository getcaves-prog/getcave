import { createClient } from "@/shared/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  await supabase.rpc("increment_view_count", { event_id: id });

  return NextResponse.json({ success: true });
}
