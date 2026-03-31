import { ImageResponse } from "next/og";
import { createClient } from "@/shared/lib/supabase/server";

export const runtime = "edge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: flyer } = await supabase
    .from("flyers")
    .select("image_url, title, user_id")
    .eq("id", id)
    .single();

  if (!flyer) {
    return new Response("Not found", { status: 404 });
  }

  let username = "";
  if (flyer.user_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", flyer.user_id)
      .single();
    username = profile?.username ?? "";
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "600",
          height: "900",
          backgroundColor: "#0A0A0A",
          padding: "32px",
        }}
      >
        {/* Flyer image with rounded corners */}
        <div
          style={{
            display: "flex",
            width: "536",
            height: "766",
            borderRadius: "24px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flyer.image_url}
            alt=""
            width={536}
            height={766}
            style={{
              objectFit: "cover",
              width: "100%",
              height: "100%",
            }}
          />
        </div>

        {/* Bottom bar: Logo left, Username right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "536",
            marginTop: "16px",
          }}
        >
          {/* Caves text logo */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "22px",
                color: "#F5F5F5",
                fontFamily: "serif",
                fontStyle: "italic",
              }}
            >
              Caves
            </span>
          </div>

          {/* Username */}
          {username && (
            <span
              style={{
                fontSize: "16px",
                color: "#8A8A8A",
              }}
            >
              @{username}
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: 600,
      height: 900,
    }
  );
}
