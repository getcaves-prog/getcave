import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search",
};

export default function SearchPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4 pb-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-space-grotesk)]">Search</h1>
        <p className="mt-2 text-[#A0A0A0]">Find events by location or category</p>
      </div>
    </div>
  );
}
