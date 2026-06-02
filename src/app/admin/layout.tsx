import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh bg-cave-black">
      <AdminSidebar />
      <main className="flex-1 px-4 pt-16 pb-6 md:ml-60 md:px-8 md:pt-8 md:pb-8">
        {children}
      </main>
    </div>
  );
}
