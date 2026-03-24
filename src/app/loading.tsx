import { LoadingSpinner } from "@/shared/components/ui/loading-spinner";

export default function Loading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#0A0A0A]">
      <LoadingSpinner size="lg" />
    </div>
  );
}
