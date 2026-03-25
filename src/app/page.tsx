import { InfiniteCanvas } from "@/features/canvas/components/infinite-canvas";
import { CanvasHeader } from "@/shared/components/layout/canvas-header";

export default function HomePage() {
  return (
    <main className="h-screen w-screen overflow-hidden">
      <CanvasHeader />
      <div style={{ paddingTop: 56 }}>
        <InfiniteCanvas />
      </div>
    </main>
  );
}
