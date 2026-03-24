import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventById } from "@/features/events/services/events.service";
import { EventDetail } from "@/features/events/components/event-detail";
import { formatDate, formatPrice } from "@/shared/lib/utils/format";

interface EventPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: EventPageProps): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) {
    return { title: "Evento no encontrado" };
  }

  const description = `${formatDate(event.date)} en ${event.venue_name}${event.price ? ` · ${formatPrice(event.price, event.currency)}` : " · Gratis"}`;

  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      images: [{ url: event.flyer_url, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [event.flyer_url],
    },
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  return <EventDetail event={event} />;
}
