import { createClient } from "@/shared/lib/supabase/client";

export async function reportFlyer(
  flyerId: string,
  reason: string
): Promise<void> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Must be logged in to report a flyer");

  const { error } = await supabase.from("flyer_reports").insert({
    flyer_id: flyerId,
    reporter_id: user.id,
    reason,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already reported this flyer");
    }
    throw new Error(`Failed to report flyer: ${error.message}`);
  }
}

export async function getReportCount(): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from("flyer_reports")
    .select("*", { count: "exact", head: true });

  if (error) return 0;
  return count ?? 0;
}

export async function getReportedFlyers(): Promise<
  { flyer_id: string; report_count: number; reasons: string[] }[]
> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("flyer_reports")
    .select("flyer_id, reason");

  if (error || !data) return [];

  // Group by flyer_id
  const grouped = new Map<string, { count: number; reasons: string[] }>();
  for (const row of data) {
    const existing = grouped.get(row.flyer_id);
    if (existing) {
      existing.count++;
      if (!existing.reasons.includes(row.reason)) {
        existing.reasons.push(row.reason);
      }
    } else {
      grouped.set(row.flyer_id, { count: 1, reasons: [row.reason] });
    }
  }

  return Array.from(grouped.entries()).map(([flyer_id, { count, reasons }]) => ({
    flyer_id,
    report_count: count,
    reasons,
  }));
}
