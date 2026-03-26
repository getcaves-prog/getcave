"use client";

import { useState, useEffect } from "react";
import {
  getUsers,
  updateUserRole,
} from "@/features/admin/services/admin.service";
import type { Profile, UserRole } from "@/features/admin/types/admin.types";

const ROLES: UserRole[] = ["admin", "user", "lector"];

export function UserTable() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleRoleChange = async (userId: string, role: UserRole) => {
    try {
      await updateUserRole(userId, role);
      await fetchUsers();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  return (
    <div>
      <h2 className="mb-6 font-[family-name:var(--font-space-mono)] text-lg text-cave-white">
        User Management
      </h2>

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
              <div className="flex items-start gap-3">
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
                </div>
                <select
                  value={user.role}
                  onChange={(e) =>
                    handleRoleChange(
                      user.id,
                      e.target.value as UserRole
                    )
                  }
                  className="min-h-[44px] shrink-0 rounded-lg border border-cave-ash bg-cave-rock px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-white outline-none focus:border-cave-fog"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-cave-fog"
                >
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
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
                      onChange={(e) =>
                        handleRoleChange(
                          user.id,
                          e.target.value as UserRole
                        )
                      }
                      className="rounded-lg border border-cave-ash bg-cave-rock px-2 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-white outline-none focus:border-cave-fog"
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                    {new Date(user.created_at).toLocaleDateString()}
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
