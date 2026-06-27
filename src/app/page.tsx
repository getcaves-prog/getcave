import { HomeHero } from "@/features/home/components/home-hero";
import { CavesCarousel } from "@/features/home/components/caves-carousel";

export default function HomePage() {
  return (
    <main className="min-h-dvh w-full bg-cave-black pb-24">
      <HomeHero />
      <CavesCarousel />
    </main>
  );
}
