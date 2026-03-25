interface HeatResponse {
  heated: boolean;
  heat_count: number;
}

export async function toggleHeat(eventId: string): Promise<HeatResponse> {
  const res = await fetch(`/api/events/${eventId}/heat`, { method: "POST" });

  if (!res.ok) {
    throw new Error("Error al cambiar el calor");
  }

  return res.json();
}
