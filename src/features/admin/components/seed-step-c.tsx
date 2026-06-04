"use client";

import { useState, useEffect } from "react";
import {
  listChannels,
  getOrCreateChannelConversation,
} from "@/features/communities/services/channels.service";
import { postOfficialMessage } from "@/features/communities/services/seeding.service";
import type { CommunityChannel } from "@/features/communities/types/community.types";
import type { Tables } from "@/shared/types/database.types";

type Community = Tables<"communities">;

// ─── SeedStepC ────────────────────────────────────────────────────────────────

interface SeedStepCProps {
  community: Community;
  onContinue: () => void;
}

interface SentMessage {
  body: string;
  channelName: string;
}

export function SeedStepC({ community, onContinue }: SeedStepCProps) {
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [channelError, setChannelError] = useState<string | null>(null);

  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([]);

  // Load channels on mount
  useEffect(() => {
    async function load() {
      try {
        const ch = await listChannels(community.id);
        setChannels(ch);
        // Default to the first channel (usually "General")
        if (ch.length > 0) {
          setSelectedChannelId(ch[0].id);
        }
      } catch (err) {
        setChannelError(
          err instanceof Error ? err.message : "Error al cargar canales"
        );
      } finally {
        setLoadingChannels(false);
      }
    }
    load();
  }, [community.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("El mensaje no puede estar vacío");
      return;
    }

    if (!selectedChannelId) {
      setError("Seleccioná un canal");
      return;
    }

    setSubmitting(true);
    try {
      // Get or create the conversation for the selected channel
      await getOrCreateChannelConversation(selectedChannelId);

      // Post the official message targeting the channel conversation
      await postOfficialMessage("channel", selectedChannelId, body.trim());

      const channelName =
        channels.find((c) => c.id === selectedChannelId)?.name ?? "Canal";

      setSentMessages((prev) => [
        { body: body.trim(), channelName },
        ...prev,
      ]);
      setBody("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al publicar el mensaje"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6">
        <h3 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-white">
          Publicar mensaje oficial
        </h3>

        {loadingChannels ? (
          <div className="flex items-center gap-2 text-sm text-cave-fog">
            <div className="h-4 w-4 animate-spin rounded-full border border-cave-fog border-t-transparent" />
            Cargando canales…
          </div>
        ) : channelError ? (
          <p className="text-sm text-neon-pink">{channelError}</p>
        ) : channels.length === 0 ? (
          <p className="text-sm text-cave-fog">
            Esta comunidad no tiene canales todavía. Podés saltarte este paso.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Channel selector */}
            <div>
              <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                Canal destino
              </label>
              <select
                value={selectedChannelId}
                onChange={(e) => setSelectedChannelId(e.target.value)}
                className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white outline-none transition-colors focus:border-cave-fog"
              >
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name}
                    {ch.is_default ? " (General)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Message body */}
            <div>
              <label className="mb-1 block font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                Mensaje oficial <span className="text-neon-pink">*</span>
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Bienvenidos a la comunidad. Este es el canal oficial de CAVES…"
                rows={4}
                maxLength={2000}
                className="w-full rounded-xl border border-cave-ash bg-cave-rock px-3 py-2 text-sm text-cave-white placeholder-cave-smoke outline-none transition-colors focus:border-cave-fog resize-none"
              />
              <p className="mt-1 text-right font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke">
                {body.length}/2000
              </p>
            </div>

            {error && (
              <p className="rounded-lg border border-neon-pink/30 bg-neon-pink/10 px-3 py-2 text-xs text-neon-pink">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] rounded-full bg-cave-white px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80 disabled:opacity-50"
            >
              {submitting ? "Publicando…" : "Publicar mensaje"}
            </button>
          </form>
        )}
      </div>

      {/* Sent messages list */}
      {sentMessages.length > 0 && (
        <div className="rounded-xl border border-cave-ash bg-cave-stone p-4">
          <p className="mb-3 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog uppercase tracking-wider">
            Mensajes enviados ({sentMessages.length})
          </p>
          <ul className="space-y-2">
            {sentMessages.map((msg, idx) => (
              <li
                key={idx}
                className="rounded-lg border border-cave-ash bg-cave-rock p-3"
              >
                <p className="mb-1 font-[family-name:var(--font-space-mono)] text-[10px] text-cave-smoke uppercase tracking-wider">
                  #{msg.channelName} · CAVES oficial
                </p>
                <p className="text-sm text-cave-white">{msg.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continue */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-cave-fog">
          {sentMessages.length === 0
            ? "Podés saltarte este paso."
            : `${sentMessages.length} mensaje${sentMessages.length > 1 ? "s" : ""} publicado${sentMessages.length > 1 ? "s" : ""}.`}
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="min-h-[44px] rounded-full bg-cave-white px-5 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80"
        >
          Finalizar →
        </button>
      </div>
    </div>
  );
}
