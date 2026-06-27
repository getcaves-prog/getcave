import { HomeHero } from "@/features/home/components/home-hero";
import { HowItWorks } from "@/features/home/components/how-it-works";
import { TransformationExample } from "@/features/home/components/transformation-example";
import { CavesCarousel } from "@/features/home/components/caves-carousel";
import { BottomNav } from "@/features/home/components/bottom-nav";

export default function HomePage() {
  return (
    <main className="min-h-dvh w-full bg-cave-black pb-24">
      <HomeHero />
      <HowItWorks />
      <TransformationExample />
      <CavesCarousel />
      <BottomNav />
    </main>
  );
}
