"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getFlyers,
  updateFlyerStatus,
  deleteFlyer,
  deleteAllTestFlyers,
  promoteFlyer,
  unpromoteFlyer,
} from "@/features/admin/services/admin.service";
import { StatusDot } from "@/features/admin/components/status-dot";
import { FlyerCreateForm } from "@/features/admin/components/flyer-create-form";
import type { Flyer, FlyerStatus } from "@/features/admin/types/admin.types";

const TABS = ["all", "pending", "approved", "rejected"] as const;

export function FlyerTable() {
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  const fetchFlyers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFlyers(activeTab);
      setFlyers(data);
    } catch (err) {
      console.error("Failed to fetch flyers:", err);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchFlyers();
  }, [fetchFlyers]);

  const handleStatusChange = async (id: string, status: FlyerStatus) => {
    try {
      await updateFlyerStatus(id, status);
      await fetchFlyers();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this flyer? This action cannot be undone.")) return;
    try {
      await deleteFlyer(id);
      await fetchFlyers();
    } catch (err) {
      console.error("Failed to delete flyer:", err);
    }
  };

  const handlePromoteToggle = async (flyer: Flyer) => {
    try {
      if (flyer.is_promoted) {
        await unpromoteFlyer(flyer.id);
      } else {
        await promoteFlyer(flyer.id, 30);
      }
      await fetchFlyers();
    } catch (err) {
      console.error("Failed to toggle promotion:", err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-[family-name:var(--font-space-mono)] text-lg text-cave-white">
          Flyer Management
        </h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <button
            onClick={async () => {
              if (
                !window.confirm(
                  "Delete ALL test flyers? This action cannot be undone."
                )
              )
                return;
              try {
                await deleteAllTestFlyers();
                await fetchFlyers();
              } catch (err) {
                console.error("Failed to delete test flyers:", err);
              }
            }}
            className="min-h-[44px] rounded-full border border-red-500 px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-red-500 transition-colors hover:bg-red-500 hover:text-cave-white"
          >
            Delete Test Flyers
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="min-h-[44px] rounded-full bg-cave-white px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80"
          >
            {showCreate ? "Cancel" : "Create Flyer"}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <FlyerCreateForm
          onCreated={() => {
            setShowCreate(false);
            fetchFlyers();
          }}
        />
      )}

      {/* Status tabs — horizontally scrollable on mobile */}
      <div className="mb-4 flex flex-wrap gap-2 pb-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`min-h-[44px] shrink-0 rounded-full px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-xs capitalize transition-colors ${
              activeTab === tab
                ? "bg-cave-white text-cave-black"
                : "border border-cave-ash text-cave-fog hover:text-cave-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl bg-cave-stone"
              />
            ))}
          </div>
        ) : flyers.length === 0 ? (
          <div className="rounded-xl border border-cave-ash p-8 text-center text-cave-fog">
            No flyers found
          </div>
        ) : (
          flyers.map((flyer) => (
            <div
              key={flyer.id}
              className="rounded-xl border border-cave-ash bg-cave-stone p-4"
            >
              <div className="flex gap-3">
                <img
                  src={flyer.image_url}
                  alt={flyer.title ?? ""}
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-cave-white">
                    {flyer.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-cave-fog">
                    {flyer.address}
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <StatusDot status={flyer.status} />
                    <span className="font-[family-name:var(--font-space-mono)] text-xs text-cave-smoke">
                      {new Date(flyer.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {flyer.status !== "approved" && (
                  <button
                    onClick={() =>
                      handleStatusChange(flyer.id, "approved")
                    }
                    className="min-h-[44px] flex-1 rounded-full border border-cave-ash px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-white transition-colors hover:bg-cave-white hover:text-cave-black"
                  >
                    Approve
                  </button>
                )}
                {flyer.status !== "rejected" && (
                  <button
                    onClick={() =>
                      handleStatusChange(flyer.id, "rejected")
                    }
                    className="min-h-[44px] flex-1 rounded-full border border-cave-ash px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:bg-cave-rock"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => handlePromoteToggle(flyer)}
                  className={`min-h-[44px] flex-1 rounded-full border px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
                    flyer.is_promoted
                      ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                      : "border-cave-ash text-cave-fog hover:bg-cave-rock"
                  }`}
                >
                  {flyer.is_promoted ? "Unpromote" : "Promote"}
                </button>
                <button
                  onClick={() => handleDelete(flyer.id)}
                  className="min-h-[44px] flex-1 rounded-full border border-cave-ash px-3 py-2 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:bg-cave-rock"
                >
                  Delete
                </button>
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
                Image
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Title
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Address
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-left font-[family-name:var(--font-space-mono)] text-xs tracking-wider text-cave-fog uppercase">
                Date
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
            ) : flyers.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-cave-fog"
                >
                  No flyers found
                </td>
              </tr>
            ) : (
              flyers.map((flyer) => (
                <tr
                  key={flyer.id}
                  className="border-b border-cave-ash last:border-0 transition-colors hover:bg-cave-stone/50"
                >
                  <td className="px-4 py-3">
                    <img
                      src={flyer.image_url}
                      alt={flyer.title ?? ""}
                      className="h-10 w-10 rounded-lg object-cover"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-cave-white">
                    {flyer.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-cave-fog">
                    {flyer.address}
                  </td>
                  <td className="px-4 py-3">
                    <StatusDot status={flyer.status} />
                  </td>
                  <td className="px-4 py-3 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog">
                    {new Date(flyer.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {flyer.status !== "approved" && (
                        <button
                          onClick={() =>
                            handleStatusChange(flyer.id, "approved")
                          }
                          className="rounded-full border border-cave-ash px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-white transition-colors hover:bg-cave-white hover:text-cave-black"
                        >
                          Approve
                        </button>
                      )}
                      {flyer.status !== "rejected" && (
                        <button
                          onClick={() =>
                            handleStatusChange(flyer.id, "rejected")
                          }
                          className="rounded-full border border-cave-ash px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:bg-cave-rock"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handlePromoteToggle(flyer)}
                        className={`rounded-full border px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs transition-colors ${
                          flyer.is_promoted
                            ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                            : "border-cave-ash text-cave-fog hover:bg-cave-rock"
                        }`}
                      >
                        {flyer.is_promoted ? "Unpromote" : "Promote"}
                      </button>
                      <button
                        onClick={() => handleDelete(flyer.id)}
                        className="rounded-full border border-cave-ash px-3 py-1 font-[family-name:var(--font-space-mono)] text-xs text-cave-fog transition-colors hover:bg-cave-rock"
                      >
                        Delete
                      </button>
                    </div>
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
