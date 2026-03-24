import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#0A0A0A] p-4 text-center">
      <h1 className="text-6xl font-bold font-[family-name:var(--font-space-grotesk)]">404</h1>
      <p className="text-[#A0A0A0]">This page doesn&apos;t exist</p>
      <Link href="/">
        <Button>Back to Feed</Button>
      </Link>
    </div>
  );
}
