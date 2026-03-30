"use client";

import { useEffect, useState } from "react";
import {
  getStats,
  getRecentFlyers,
  getAnalytics,
  getReportCount,
} from "@/features/admin/services/admin.service";
import { StatsCard } from "@/features/admin/components/stats-card";
import { StatusDot } from "@/features/admin/components/status-dot";
import type { AdminStats, Flyer } from "@/features/admin/types/admin.types";

interface Analytics {
  weeklyViews: number;
  topFlyers: { id: string; title: string | null; image_url: string; views_count: number }[];
  activeUploaders: number;
  expiringSoon: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats>({
    totalFlyers: 0,
    pendingFlyers: 0,
    totalUsers: 0,
  });
  const [recentFlyers, setRecentFlyers] = useState<Flyer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reportCount, setReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

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

    async function fetchAnalytics() {
      try {
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setAnalyticsLoading(false);
      }
    }

    async function fetchReports() {
      try {
        const count = await getReportCount();
        setReportCount(count);
      } catch (err) {
        console.error("Failed to fetch report count:", err);
      }
    }

    fetchData();
    fetchAnalytics();
    fetchReports();
  }, []);

  return (
    <div className="px-4 sm:px-0">
      <h1 className="mb-8 font-[family-name:var(--font-space-mono)] text-xl text-cave-white">
        Dashboard
      </h1>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
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
        <StatsCard
          label="Reports"
          value={reportCount}
          loading={loading}
        />
      </div>

      {/* Analytics section */}
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatsCard
          label="Views This Week"
          value={analytics?.weeklyViews ?? 0}
          loading={analyticsLoading}
        />
        <StatsCard
          label="Expiring Soon"
          value={analytics?.expiringSoon ?? 0}
          loading={analyticsLoading}
        />
        <StatsCard
          label="Active Uploaders (30d)"
          value={analytics?.activeUploaders ?? 0}
          loading={analyticsLoading}
        />
      </div>

      {/* Top viewed flyers */}
      <div className="mb-8 rounded-xl border border-cave-ash bg-cave-stone p-4 sm:p-6">
        <h2 className="mb-4 font-[family-name:var(--font-space-mono)] text-sm text-cave-fog uppercase tracking-wider">
          Top Viewed Flyers
        </h2>

        {analyticsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-cave-rock"
              />
            ))}
          </div>
        ) : !analytics?.topFlyers.length ? (
          <p className="text-sm text-cave-fog">No view data yet</p>
        ) : (
          <div className="space-y-3">
            {analytics.topFlyers.map((flyer, index) => (
              <div
                key={flyer.id}
                className="flex items-center gap-3 rounded-lg border border-cave-ash p-3 transition-colors hover:bg-cave-rock/50"
              >
                <span className="w-5 text-center font-[family-name:var(--font-space-mono)] text-xs text-cave-smoke">
                  {index + 1}
                </span>
                <img
                  src={flyer.image_url}
                  alt={flyer.title ?? ""}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-cave-white">
                    {flyer.title || "Untitled"}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  {flyer.views_count}
                </span>
              </div>
            ))}
          </div>
        )}
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
                className="flex flex-wrap items-center gap-3 rounded-lg border border-cave-ash p-3 transition-colors hover:bg-cave-rock/50 sm:gap-4"
              >
                <img
                  src={flyer.image_url}
                  alt={flyer.title ?? ""}
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
