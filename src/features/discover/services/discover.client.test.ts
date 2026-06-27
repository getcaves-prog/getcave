import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { discoverEvents } from "./discover.client";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ events: [] }) });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("discoverEvents", () => {
  it("returns [] without fetching for an empty query", async () => {
    const result = await discoverEvents("   ");
    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("POSTs query + city + coords in the body", async () => {
    await discoverEvents("salsa", "Cúcuta", { lat: 7.8939, lng: -72.5078 });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      query: "salsa",
      city: "Cúcuta",
      lat: 7.8939,
      lng: -72.5078,
    });
  });

  it("omits coords from the body when not provided", async () => {
    await discoverEvents("salsa", "Cúcuta");

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      query: "salsa",
      city: "Cúcuta",
    });
  });

  it("returns the events array from the response", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ events: [{ id: "a" }] }),
    });
    const result = await discoverEvents("salsa", undefined, {
      lat: 1,
      lng: 2,
    });
    expect(result).toEqual([{ id: "a" }]);
  });

  it("returns [] on a non-ok response", async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    expect(await discoverEvents("salsa")).toEqual([]);
  });

  it("returns [] when fetch throws", async () => {
    fetchMock.mockRejectedValue(new Error("network"));
    expect(await discoverEvents("salsa")).toEqual([]);
  });
});
