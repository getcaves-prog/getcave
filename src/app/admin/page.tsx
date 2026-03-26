"use client";

import { useEffect, useState } from "react";
import {
  getStats,
  getRecentFlyers,
} from "@/features/admin/services/admin.service";
import { StatsCard } from "@/features/admin/components/stats-card";
import { StatusDot } from "@/features/admin/components/status-dot";
import type { AdminStats, Flyer } from "@/features/admin/types/admin.types";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalFlyers: 0,
    pendingFlyers: 0,
    totalUsers: 0,
  });
  const [recentFlyers, setRecentFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, flyersData] = await Promise.all([
          getStats(),
          getRecentFlyers(),
        ]);
        setStats(statsData);
        setRecentFlyers(flyersData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      <h1 className="mb-8 font-[family-name:var(--font-space-mono)] text-xl text-cave-white">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatsCard
          label="Total Flyers"
          value={stats.totalFlyers}
          loading={loading}
        />
        <StatsCard
          label="Pending Review"
          value={stats.pendingFlyers}
          loading={loading}
        />
        <StatsCard
          label="Total Users"
          value={stats.totalUsers}
          loading={loading}
        />
      </div>

      {/* Recent flyers */}
      <div className="rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6">
        <h2 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-fog uppercase tracking-wider">
          Recent Flyers
        </h2>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-cave-rock"
              />
            ))}
          </div>
        ) : recentFlyers.length === 0 ? (
          <p className="text-sm text-cave-fog">No flyers yet</p>
        ) : (
          <div className="space-y-3">
            {recentFlyers.map((flyer) => (
              <div
                key={flyer.id}
                className="flex items-center gap-4 rounded-lg border border-cave-ash p-3 transition-colors hover:bg-cave-rock/50"
              >
                <img
                  src={flyer.image_url}
                  alt={flyer.title}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cave-white">
                    {flyer.title}
                  </p>
                  <p className="truncate font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                    {flyer.address}
                  </p>
                </div>
                <StatusDot status={flyer.status} />
                <span className="font-[family-name:var(--font-space-mono)] text-xs text-cave-smoke">
                  {new Date(flyer.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
