/**
 * Seed script to populate the flyers table with 30 test records.
 *
 * Uses picsum.photos for placeholder images (vertical flyer-like posters).
 * Positions are randomly scattered across a large canvas area.
 *
 * Usage: npx tsx scripts/seed-flyers.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://akcjzvftujuscaqnydzj.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrY2p6dmZ0dWp1c2NhcW55ZHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjk3NDQsImV4cCI6MjA4OTk0NTc0NH0.Z3xX-WXyVC4_smLS7dcn6Zp2EyEkGSQ2CB5a-qMUfjE";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FLYER_COUNT = 30;
const CANVAS_RANGE = 2000; // -2000 to 2000
const ROTATION_RANGE = 5; // -5 to 5 degrees

const EVENT_NAMES = [
  "Noche de Rock Underground",
  "DJ Set: Midnight Pulse",
  "Festival de Arte Callejero",
  "Batalla de Bandas",
  "Noche de Jazz & Blues",
  "Techno Warehouse Party",
  "Feria de Vinilo",
  "Open Mic Night",
  "Hip Hop Battle Royale",
  "Punk Night Vol. 7",
  "Sesión de Graffiti en Vivo",
  "Cumbia Electrónica",
  "Noche Indie",
  "Metal Fest Underground",
  "Drum & Bass Sessions",
  "Noche de Reggae",
  "Acoustic Sessions",
  "Electro Swing Party",
  "Funk & Soul Night",
  "Noche de Trova",
  "Synth Wave Experience",
  "Latin Bass Night",
  "Ska Punk Revival",
  "Noche de Boleros",
  "Dark Wave Party",
  "Tropical Bass Fest",
  "Garage Rock Night",
  "Noche de Salsa Dura",
  "Post-Punk Revival",
  "Psychedelic Sessions",
];

function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function seed() {
  console.log("Seeding flyers table with", FLYER_COUNT, "records...");

  // Check if flyers already exist
  const { count } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Table already has ${count} flyers. Clearing first...`);
    // Delete using a filter that matches all (RLS allows select, not delete for anon)
    // If this fails, we'll just insert anyway
    const { error: deleteError } = await supabase
      .from("flyers")
      .delete()
      .gte("created_at", "1970-01-01");

    if (deleteError) {
      console.warn("Could not clear existing flyers:", deleteError.message);
      console.log("Inserting additional flyers...");
    }
  }

  const flyers = Array.from({ length: FLYER_COUNT }, (_, i) => ({
    image_url: `https://picsum.photos/seed/cave-flyer-${i + 1}/280/400`,
    title: EVENT_NAMES[i % EVENT_NAMES.length],
    canvas_x: randomInRange(-CANVAS_RANGE, CANVAS_RANGE),
    canvas_y: randomInRange(-CANVAS_RANGE, CANVAS_RANGE),
    rotation: randomInRange(-ROTATION_RANGE, ROTATION_RANGE),
    width: 280,
    height: 400,
  }));

  const { data, error } = await supabase.from("flyers").insert(flyers).select();

  if (error) {
    console.error("Failed to insert flyers:", error.message);
    process.exit(1);
  }

  console.log(`Successfully inserted ${data.length} flyers!`);
  console.log("Sample positions:");
  data.slice(0, 3).forEach((f) => {
    console.log(
      `  "${f.title}" at (${f.canvas_x.toFixed(0)}, ${f.canvas_y.toFixed(0)}) rot=${f.rotation.toFixed(1)}°`
    );
  });
}

seed();
