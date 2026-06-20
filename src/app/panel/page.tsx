import type { Metadata } from "next";
import { CreatorAnalyticsPanel } from "@/features/analytics/components/creator-analytics-panel";

export const metadata: Metadata = {
  title: "Tus estadísticas · Caves",
  description: "El rendimiento de los flyers que publicaste.",
};

export default function PanelPage() {
  return <CreatorAnalyticsPanel />;
}
