"use client";

export function CanvasHeader() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center backdrop-blur-md"
      style={{
        height: 56,
        backgroundColor: "rgba(5, 5, 5, 0.8)",
      }}
    >
      <h1 className="text-3xl text-cave-white font-[family-name:var(--font-pinyon-script)]">
        Caves
      </h1>
    </header>
  );
}
