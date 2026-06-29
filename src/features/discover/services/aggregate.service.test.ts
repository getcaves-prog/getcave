import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ScrapedFlyer } from "@/features/discover/types/discover.types";

const { apifyEnabled, apifyFetch, tmEnabled, tmFetch } = vi.hoisted(() => ({
  apifyEnabled: vi.fn(),
  apifyFetch: vi.fn(),
  tmEnabled: vi.fn(),
  tmFetch: vi.fn(),
}));

vi.mock("@/features/discover/providers/apify.provider", () => ({
  apifyProvider: {
    name: "apify",
    isEnabled: apifyEnabled,
    fetchEvents: apifyFetch,
  },
}));

vi.mock("@/features/discover/providers/ticketmaster.provider", () => ({
  ticketmasterProvider: {
    name: "ticketmaster",
    isEnabled: tmEnabled,
    fetchEvents: tmFetch,
  },
}));

import {
  aggregateEvents,
  hasEnabledProvider,
} from "./aggregate.service";
import { ProvidersUnavailableError } from "@/features/discover/providers/provider.types";

const flyer = (id: string): ScrapedFlyer => ({ id }) as unknown as ScrapedFlyer;

beforeEach(() => {
  vi.clearAllMocks();
  apifyEnabled.mockReturnValue(true);
  tmEnabled.mockReturnValue(true);
  apifyFetch.mockResolvedValue([]);
  tmFetch.mockResolvedValue([]);
});

describe("hasEnabledProvider", () => {
  it("is true when any provider is enabled", () => {
    apifyEnabled.mockReturnValue(false);
    tmEnabled.mockReturnValue(true);
    expect(hasEnabledProvider()).toBe(true);
  });

  it("is false when no provider is enabled", () => {
    apifyEnabled.mockReturnValue(false);
    tmEnabled.mockReturnValue(false);
    expect(hasEnabledProvider()).toBe(false);
  });
});

describe("aggregateEvents", () => {
  it("returns [] without calling providers when none are enabled", async () => {
    apifyEnabled.mockReturnValue(false);
    tmEnabled.mockReturnValue(false);

    const result = await aggregateEvents({ query: "techno" });

    expect(result).toEqual([]);
    expect(apifyFetch).not.toHaveBeenCalled();
    expect(tmFetch).not.toHaveBeenCalled();
  });

  it("only calls enabled providers", async () => {
    apifyEnabled.mockReturnValue(true);
    tmEnabled.mockReturnValue(false);
    apifyFetch.mockResolvedValue([flyer("a")]);

    const result = await aggregateEvents({ query: "techno" });

    expect(apifyFetch).toHaveBeenCalledWith({ query: "techno" });
    expect(tmFetch).not.toHaveBeenCalled();
    expect(result.map((f) => f.id)).toEqual(["a"]);
  });

  it("merges results from all enabled providers", async () => {
    apifyFetch.mockResolvedValue([flyer("a")]);
    tmFetch.mockResolvedValue([flyer("b")]);

    const result = await aggregateEvents({ query: "techno" });

    expect(result.map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  it("dedupes flyers sharing an id across providers", async () => {
    apifyFetch.mockResolvedValue([flyer("dup")]);
    tmFetch.mockResolvedValue([flyer("dup")]);

    const result = await aggregateEvents({ query: "techno" });

    expect(result).toHaveLength(1);
  });

  it("returns the surviving provider's results when one fails", async () => {
    apifyFetch.mockRejectedValue(new Error("apify down"));
    tmFetch.mockResolvedValue([flyer("tm")]);

    const result = await aggregateEvents({ query: "techno" });

    expect(result.map((f) => f.id)).toEqual(["tm"]);
  });

  it("throws ProvidersUnavailableError when all providers fail and nothing is fetched", async () => {
    apifyFetch.mockRejectedValue(new Error("apify down"));
    tmFetch.mockRejectedValue(new Error("tm down"));

    await expect(aggregateEvents({ query: "techno" })).rejects.toBeInstanceOf(
      ProvidersUnavailableError
    );
  });

  it("does NOT throw when providers succeed with genuinely zero results", async () => {
    apifyFetch.mockResolvedValue([]);
    tmFetch.mockResolvedValue([]);

    await expect(aggregateEvents({ query: "techno" })).resolves.toEqual([]);
  });
});
