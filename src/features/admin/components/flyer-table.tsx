"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getFlyers,
  updateFlyerStatus,
  deleteFlyer,
  deleteAllTestFlyers,
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

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-[family-name:var(--font-space-mono)] text-lg text-cave-white">
          Flyer Management
        </h2>
        <div className="flex gap-2">
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
            className="rounded-full border border-red-500 px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-red-500 transition-colors hover:bg-red-500 hover:text-cave-white"
          >
            Delete Test Flyers
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="rounded-full bg-cave-white px-4 py-2 font-[family-name:var(--font-space-mono)] text-xs font-bold text-cave-black transition-opacity hover:opacity-80"
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

      {/* Status tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-4 py-1.5 font-[family-name:var(--font-space-mono)] text-xs capitalize transition-colors ${
              activeTab === tab
                ? "bg-cave-white text-cave-black"
                : "border border-cave-ash text-cave-fog hover:text-cave-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-cave-ash">
        <table className="w-full min-w-[640px]">
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
                      alt={flyer.title}
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
