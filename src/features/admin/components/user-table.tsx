"use client";

import { useState, useEffect } from "react";
import { getUsers } from "@/features/admin/services/admin.service";
import { updateUserRoleAction, deleteUserAction } from "@/features/admin/services/admin.actions";
import type { Profile, UserRole } from "@/features/admin/types/admin.types";

const ROLES: UserRole[] = ["admin", "user", "lector"];

export function UserTable() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId: string) => {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId);
      return;
    }
    setDeletingId(userId);
    setConfirmDeleteId(null);
    try {
      await deleteUserAction(userId);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setRoleError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setUpdatingId(userId);
    setRoleError(null);
    try {
      await updateUserRoleAction(userId, role);
      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update role";
      setRoleError(message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div>
      <h2 className="mb-6 font-[family-name:var(--font-space-mono)] text-lg text-cave-white">
        User Management
      </h2>

      {roleError && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-[family-name:var(--font-space-mono)] text-sm text-red-400">
          Error: {roleError}
        </div>
      )}

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-xl bg-cave-stone"
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-cave-ash p-8 text-center text-cave-fog">
            No users found
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-cave-ash bg-cave-stone p-4"
            >
              <div className="flex items-center gap-3">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cave-rock font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                    {user.username[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cave-white">
                    {user.username}
                  </p>
                  <p className="mt-0.5 text-xs text-cave-fog">
                    {user.city ?? "No city"}
                  </p>
                  <p className="mt-0.5 font-[family-name:var(--font-space-mono)] text-xs text-cave-smoke">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                  {user.terms_acceptances?.[0] ? (
                    <p className="mt-0.5 font-[family-name:var(--font-space-mono)] text-xs text-green-400">
                      ✓ Terms v{user.terms_acceptances[0].terms_version} · {new Date(user.terms_acceptances[0].accepted_at).toLocaleDateString()}
                    </p>
                  ) : (
                    <p className="mt-0.5 font-[family-name:var(--font-space-mono)] text-xs text-cave-ash">
                      No terms record
                    </p>
                  )}
                </div>
              </div>
              <select
                value={user.role}
                disabled={updatingId === user.id}
                onChange={(e) =>
                  handleRoleChange(user.id, e.target.value as UserRole)
                }
                className="mt-3 min-h-[44px] w-full rounded-lg border border-cave-ash bg-cave-rock px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-white outline-none focus:border-cave-fog disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {updatingId === user.id && role === user.role ? "Saving…" : role}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDelete(user.id)}
                disabled={deletingId === user.id}
                className="mt-2 min-h-[44px] w-full rounded-lg border border-neon-pink/40 bg-neon-pink/10 font-[family-name:var(--font-space-mono)] text-xs text-neon-pink transition-colors hover:bg-neon-pink/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId === user.id
                  ? "Eliminando…"
                  : confirmDeleteId === user.id
                  ? "¿Confirmar eliminación?"
                  : "Eliminar usuario"}
              </button>
            </div>
          ))
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-cave-ash md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-cave-ash bg-cave-stone">
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Username
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                City
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Role
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Created
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Terms
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-cave-fog"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-cave-fog"
                >
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-cave-ash last:border-0 transition-colors hover:bg-cave-stone/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cave-rock font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                          {user.username[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <span className="text-sm text-cave-white">
                        {user.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-cave-fog">
                    {user.city ?? "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={user.role}
                      disabled={updatingId === user.id}
                      onChange={(e) =>
                        handleRoleChange(user.id, e.target.value as UserRole)
                      }
                      className="rounded-lg border border-cave-ash bg-cave-rock px-2 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-white outline-none focus:border-cave-fog disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {updatingId === user.id && role === user.role ? "Saving…" : role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs">
                    {user.terms_acceptances?.[0] ? (
                      <span className="text-green-400">
                        ✓ v{user.terms_acceptances[0].terms_version}<br />
                        <span className="text-cave-smoke">
                          {new Date(user.terms_acceptances[0].accepted_at).toLocaleDateString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-cave-ash">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      className="rounded-lg border border-neon-pink/40 bg-neon-pink/10 px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs text-neon-pink transition-colors hover:bg-neon-pink/20 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
                    >
                      {deletingId === user.id
                        ? "Eliminando…"
                        : confirmDeleteId === user.id
                        ? "¿Confirmar?"
                        : "Eliminar"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
