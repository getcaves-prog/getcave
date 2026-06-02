/**
 * Seed script to populate the flyers table with 200 test records.
 * Uses picsum.photos with unique seeds for each image.
 *
 * Usage: npx tsx scripts/seed-flyers.ts
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.CAVESAPP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.CAVESAPP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Missing Supabase env vars");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const FLYER_COUNT = 200;

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
  "Ambient Cave Sounds",
  "Lo-Fi Beats Live",
  "Reggaeton Underground",
  "Afrobeat Sessions",
  "Noise Rock Night",
  "Downtempo Chill",
  "Hardcore Punk Vol. 3",
  "Bossa Nova Evening",
  "Dubstep Madness",
  "Neo Soul Night",
  "Breakbeat Sessions",
  "Tango Electrónico",
  "Shoegaze Dreams",
  "Grime Night MX",
  "Dub Reggae Sessions",
  "Math Rock Marathon",
  "Vaporwave Lounge",
  "Stoner Rock Fest",
  "City Pop Night",
  "Jungle Sessions",
  "Krautrock Experience",
  "Chiptune Arcade",
  "Grunge Revival",
  "Trip Hop Evening",
  "Footwork Sessions",
  "Drone Music Night",
  "Cumbia Villera Fest",
  "New Wave Revival",
  "Industrial Night",
  "UK Garage Sessions",
];

async function seed() {
  console.log(`Seeding flyers table with ${FLYER_COUNT} records...`);

  // Clear existing flyers
  const { count } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true });

  if (count && count > 0) {
    console.log(`Clearing ${count} existing flyers...`);
    await supabase.from("flyers").delete().gte("created_at", "1970-01-01");
  }

  const flyers = Array.from({ length: FLYER_COUNT }, (_, i) => ({
    image_url: `https://picsum.photos/seed/caves-${i + 100}/280/400`,
    title: EVENT_NAMES[i % EVENT_NAMES.length],
    canvas_x: 0,
    canvas_y: 0,
    rotation: 0,
    width: 280,
    height: 400,
  }));

  // Insert in batches of 50
  for (let batch = 0; batch < FLYER_COUNT; batch += 50) {
    const chunk = flyers.slice(batch, batch + 50);
    const { error } = await supabase.from("flyers").insert(chunk);

    if (error) {
      console.error(`Failed to insert batch ${batch / 50 + 1}:`, error.message);
      process.exit(1);
    }
    console.log(`  Batch ${batch / 50 + 1} inserted (${chunk.length} flyers)`);
  }

  const { count: finalCount } = await supabase
    .from("flyers")
    .select("*", { count: "exact", head: true });

  console.log(`Done! ${finalCount} flyers in database.`);
}

seed();
