import type { Metadata } from "next";
import { UploadForm } from "@/features/events/components/upload-form";
import { getCategories } from "@/features/events/services/upload.service";

export const metadata: Metadata = {
  title: "Upload Flyer",
};

export default async function UploadPage() {
  const categories = await getCategories();

  return (
    <div className="min-h-dvh bg-[#0A0A0A] pb-24">
      <header className="sticky top-0 z-40 border-b border-[#2A2A2A] bg-[#0A0A0A]/90 backdrop-blur-lg px-4 py-3">
        <h1 className="text-lg font-bold font-[family-name:var(--font-space-grotesk)]">
          Upload Flyer
        </h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <UploadForm categories={categories} />
      </div>
    </div>
  );
}
