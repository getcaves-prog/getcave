export async function registerPushNotifications() {
  // Only run in browser context
  if (typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { PushNotifications } = await import(
      "@capacitor/push-notifications"
    );

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return;

    await PushNotifications.register();

    PushNotifications.addListener("registration", (token) => {
      // Save token to Supabase profiles table (fire and forget)
      savePushToken(token.value);
    });

    PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push received:", notification);
      }
    );

    PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (notification) => {
        // Handle notification tap — navigate to relevant page
        console.log("Push action:", notification);
      }
    );
  } catch (e) {
    console.warn("Push notifications not available:", e);
  }
}

async function savePushToken(token: string) {
  const { createClient } = await import("@/shared/lib/supabase/client");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ push_token: token })
    .eq("id", user.id);
}
