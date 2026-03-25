import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("events")
    .update({ status: "past" })
    .lt("expires_at", new Date().toISOString())
    .eq("status", "active")
    .select("id");

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ cleaned: data?.length ?? 0 }),
    { headers: { "Content-Type": "application/json" } }
  );
});
