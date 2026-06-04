"use client";

import { useState, useCallback } from "react";
import { listSeededCommunities, findUserByUsername } from "../services/admin.service";
import { transferOwnership } from "@/features/communities/services/seeding.service";

// ─── Local types ──────────────────────────────────────────────────────────

interface SeededCommunity {
  id: string;
  name: string;
  slug: string;
  source_platform: string | null;
  source_url: string | null;
  claimed_at: string | null;
  member_count: number | null;
  avatar_url: string | null;
}

interface UserResult {
  id: string;
  username: string;
  avatar_url: string | null;
}

// ─── TransferOwnershipPanel ───────────────────────────────────────────────
// Admin-only panel (gated by the /admin layout). Steps:
//  1. Load seeded communities list
//  2. Pick a community
//  3. Search + pick target user (by username)
//  4. Confirm → call transferOwnership RPC
//  5. Show result (new owner, community no longer seeded)

export function TransferOwnershipPanel() {
  const [communities, setCommunities] = useState<SeededCommunity[]>([]);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [selectedCommunity, setSelectedCommunity] = useState<SeededCommunity | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferResult, setTransferResult] = useState<{
    communityName: string;
    newOwnerUsername: string;
  } | null>(null);

  // ── Step 1: load communities ───────────────────────────────────────────

  const handleLoadCommunities = useCallback(async () => {
    setLoadingCommunities(true);
    setCommunitiesError(null);
    try {
      const data = await listSeededCommunities();
      setCommunities(data as SeededCommunity[]);
      setLoaded(true);
    } catch (err) {
      setCommunitiesError(
        err instanceof Error ? err.message : "Error al cargar comunidades"
      );
    } finally {
      setLoadingCommunities(false);
    }
  }, []);

  // ── Step 2: select community ───────────────────────────────────────────

  const handleSelectCommunity = useCallback((c: SeededCommunity) => {
    setSelectedCommunity(c);
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
    setConfirming(false);
    setTransferError(null);
    setTransferResult(null);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCommunity(null);
    setSelectedUser(null);
    setUserQuery("");
    setUserResults([]);
    setConfirming(false);
    setTransferError(null);
    setTransferResult(null);
  }, []);

  // ── Step 3: search user ────────────────────────────────────────────────

  const handleUserSearch = useCallback(async (q: string) => {
    setUserQuery(q);
    setSelectedUser(null);
    if (q.trim().length < 2) {
      setUserResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const results = await findUserByUsername(q);
      setUserResults(results as UserResult[]);
    } catch {
      setUserResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  const handleSelectUser = useCallback((u: UserResult) => {
    setSelectedUser(u);
    setUserQuery(u.username);
    setUserResults([]);
    setConfirming(false);
  }, []);

  // ── Step 4: confirm + transfer ─────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!selectedCommunity || !selectedUser) return;
    setTransferring(true);
    setTransferError(null);
    try {
      await transferOwnership(selectedCommunity.id, selectedUser.id);
      setTransferResult({
        communityName: selectedCommunity.name,
        newOwnerUsername: selectedUser.username,
      });
      // Remove the transferred community from the seeded list
      setCommunities((prev) => prev.filter((c) => c.id !== selectedCommunity.id));
      setSelectedCommunity(null);
      setSelectedUser(null);
      setConfirming(false);
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : "Error al transferir la propiedad"
      );
    } finally {
      setTransferring(false);
    }
  }, [selectedCommunity, selectedUser]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 max-w-2xl">

      {/* Success banner */}
      {transferResult && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-cave-white/20 bg-cave-white/5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <p className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
              Transferencia completada
            </p>
            <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] mt-0.5">
              <span className="text-cave-white">{transferResult.communityName}</span> ahora pertenece a{" "}
              <span className="text-cave-white">@{transferResult.newOwnerUsername}</span>. La comunidad ya no está marcada como sembrada.
            </p>
          </div>
        </div>
      )}

      {/* ── Community picker ─────────────────────────────────────────────── */}
      {!selectedCommunity ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-space-mono)] text-sm font-bold text-cave-white uppercase tracking-wider">
              Comunidades sembradas
            </h2>
            {!loaded && (
              <button
                type="button"
                onClick={handleLoadCommunities}
                disabled={loadingCommunities}
                className="h-9 px-4 rounded-lg border border-cave-white/30 text-cave-white text-xs font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-space-mono)] hover:bg-cave-white/10 transition-colors disabled:opacity-40"
              >
                {loadingCommunities ? "Cargando..." : "Cargar lista"}
              </button>
            )}
          </div>

          {communitiesError && (
            <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
              {communitiesError}
            </p>
          )}

          {loaded && communities.length === 0 && (
            <div className="py-10 text-center rounded-xl border border-cave-ash/30 bg-cave-stone/20">
              <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)]">
                No hay comunidades sembradas actualmente
              </p>
            </div>
          )}

          {communities.length > 0 && (
            <div className="flex flex-col gap-2">
              {communities.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCommunity(c)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-cave-ash/40 bg-cave-stone/40 hover:border-cave-white/40 hover:bg-cave-stone/60 transition-colors text-left"
                >
                  {/* Avatar placeholder */}
                  <div className="w-10 h-10 rounded-full bg-cave-ash flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)]">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-cave-white font-bold font-[family-name:var(--font-space-mono)] truncate">
                      {c.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                        /{c.slug}
                      </span>
                      {c.source_platform && (
                        <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)] capitalize">
                          · desde {c.source_platform}
                        </span>
                      )}
                      {c.claimed_at && (
                        <span className="text-[10px] text-cave-smoke font-[family-name:var(--font-space-mono)]">
                          · reclamada {new Date(c.claimed_at).toLocaleDateString("es-MX")}
                        </span>
                      )}
                    </div>
                  </div>

                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cave-ash flex-shrink-0">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── User picker + confirm ──────────────────────────────────────── */
        <div className="flex flex-col gap-5">
          {/* Back + community info */}
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-cave-ash/40 text-cave-fog hover:text-cave-white hover:border-cave-ash transition-colors flex-shrink-0"
              aria-label="Volver"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div>
              <p className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] uppercase tracking-wider">
                Transferir propiedad de
              </p>
              <p className="text-lg font-bold text-cave-white font-[family-name:var(--font-space-mono)] leading-tight mt-0.5">
                {selectedCommunity.name}
              </p>
              {selectedCommunity.source_platform && (
                <p className="text-xs text-cave-smoke font-[family-name:var(--font-space-mono)] mt-0.5 capitalize">
                  Fuente: {selectedCommunity.source_platform}
                </p>
              )}
            </div>
          </div>

          <div className="h-px bg-cave-ash/20" />

          {/* User search */}
          <div className="flex flex-col gap-3">
            <label className="text-xs text-cave-fog font-[family-name:var(--font-space-mono)] uppercase tracking-wider">
              Nuevo propietario — buscar por username
            </label>
            <div className="relative">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                placeholder="Escribí el username del nuevo dueño..."
                className="w-full h-11 px-4 rounded-xl border border-cave-ash bg-cave-rock text-cave-white text-sm font-[family-name:var(--font-inter)] placeholder:text-cave-smoke focus:outline-none focus:border-cave-white transition-colors"
              />
              {searchingUsers && (
                <div className="absolute right-3 top-3">
                  <svg className="animate-spin w-5 h-5 text-cave-fog" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                </div>
              )}
            </div>

            {/* Results dropdown */}
            {userResults.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl border border-cave-ash/40 bg-cave-stone overflow-hidden">
                {userResults.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-cave-rock transition-colors text-left min-h-[44px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-cave-ash flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {u.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatar_url} alt={u.username} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-cave-fog font-[family-name:var(--font-space-mono)]">
                          {u.username.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-cave-white font-[family-name:var(--font-space-mono)]">
                      @{u.username}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Selected user pill */}
            {selectedUser && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-cave-white/20 bg-cave-white/5 w-fit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-xs text-cave-white font-bold font-[family-name:var(--font-space-mono)]">
                  @{selectedUser.username}
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedUser(null); setUserQuery(""); setConfirming(false); }}
                  className="text-cave-fog hover:text-cave-white transition-colors ml-1"
                  aria-label="Quitar selección"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Confirm section */}
          {selectedUser && !confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="h-11 px-6 rounded-xl border border-cave-white/40 text-cave-white text-sm font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-space-mono)] hover:bg-cave-white/10 transition-colors w-fit"
            >
              Continuar
            </button>
          )}

          {/* Confirm dialog */}
          {confirming && selectedUser && (
            <div className="flex flex-col gap-4 p-4 rounded-xl border border-[#FF2D7B]/30 bg-[#FF2D7B]/5">
              <p className="text-sm text-cave-white font-[family-name:var(--font-space-mono)] font-bold">
                ¿Confirmar transferencia?
              </p>
              <p className="text-xs text-cave-fog font-[family-name:var(--font-inter)] leading-5">
                La comunidad <span className="text-cave-white font-bold">{selectedCommunity.name}</span> pasará a ser propiedad de{" "}
                <span className="text-cave-white font-bold">@{selectedUser.username}</span>. Esta acción es irreversible desde la interfaz (requiere otra transferencia para revertirse). La comunidad dejará de estar marcada como sembrada.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={transferring}
                  className="h-10 px-5 rounded-lg bg-[#FF2D7B] text-white text-xs font-bold uppercase tracking-[0.1em] font-[family-name:var(--font-space-mono)] hover:bg-[#FF2D7B]/80 transition-colors disabled:opacity-40"
                >
                  {transferring ? "Transfiriendo..." : "Confirmar transferencia"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={transferring}
                  className="h-10 px-4 rounded-lg border border-cave-ash text-cave-fog text-xs font-[family-name:var(--font-space-mono)] hover:text-cave-white transition-colors disabled:opacity-40"
                >
                  Cancelar
                </button>
              </div>
              {transferError && (
                <p className="text-xs text-[#FF2D7B] font-[family-name:var(--font-space-mono)]">
                  {transferError}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
