/**
 * Script to delete all generic/placeholder flyers from the database.
 * Run: npx tsx scripts/delete-generic-flyers.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  // Count total flyers
  const { count: total } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true });

  console.log(`Total flyers in DB: ${total}`);

  // Find generic flyers (picsum, unsplash, placeholder, or no real Supabase URL)
  const { data: genericFlyers, error: fetchError } = await supabase
    .from("flyers")
    .select("id, title, image_url")
    .or("image_url.like.%picsum%,image_url.like.%placeholder%,image_url.like.%unsplash%,image_url.like.%lorem%");

  if (fetchError) {
    console.error("Error fetching:", fetchError.message);
    process.exit(1);
  }

  console.log(`Found ${genericFlyers?.length ?? 0} generic flyers to delete:`);
  genericFlyers?.forEach((f) => console.log(`  - [${f.id}] ${f.title || "untitled"} → ${f.image_url?.slice(0, 60)}...`));

  if (!genericFlyers?.length) {
    console.log("Nothing to delete. All flyers are user-uploaded.");
    return;
  }

  // Delete them
  const ids = genericFlyers.map((f) => f.id);
  const { error: deleteError } = await supabase
    .from("flyers")
    .delete()
    .in("id", ids);

  if (deleteError) {
    console.error("Error deleting:", deleteError.message);
    process.exit(1);
  }

  // Count remaining
  const { count: remaining } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true });

  console.log(`\nDeleted ${ids.length} generic flyers.`);
  console.log(`Remaining flyers: ${remaining}`);
}

main().catch(console.error);
