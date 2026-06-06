import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ─── MediaRecorder mock setup ──────────────────────────────────────────────
// We must install the mock BEFORE importing the hook module because the
// `isMediaRecorderSupported` constant is evaluated at import time.

// Track instances so tests can introspect
let lastRecorder: MockMediaRecorder | null = null;

class MockMediaRecorder {
  static isTypeSupported = vi.fn().mockReturnValue(true);
  state: "inactive" | "recording" = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  private _mime: string;

  constructor(_stream: MediaStream, opts?: { mimeType?: string }) {
    this._mime = opts?.mimeType ?? "audio/webm";
    lastRecorder = this;
  }

  start(_timeslice?: number) {
    this.state = "recording";
  }

  stop() {
    if (this.state === "recording") {
      this.state = "inactive";
      // Emit a data chunk then fire onstop
      this.ondataavailable?.({ data: new Blob(["audio"], { type: this._mime }) });
      this.onstop?.();
    } else {
      // Already stopped (cancel path): still fire onstop so cancel can clear it
      this.onstop?.();
    }
  }
}

const mockGetUserMedia = vi.fn();
const fakeTrack = { stop: vi.fn() };

// Install on globalThis so that typeof window.MediaRecorder check passes
Object.defineProperty(globalThis, "MediaRecorder", {
  value: MockMediaRecorder,
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, "navigator", {
  value: {
    ...globalThis.navigator,
    mediaDevices: { getUserMedia: mockGetUserMedia },
  },
  writable: true,
  configurable: true,
});

// Import AFTER injecting mocks so the module sees them at load time
const { useAudioRecorder } = await import("./use-audio-recorder");

// ─── Per-test setup ────────────────────────────────────────────────────────

beforeEach(() => {
  lastRecorder = null;
  fakeTrack.stop.mockReset();
  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [fakeTrack],
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("useAudioRecorder", () => {
  it("starts in idle state with supported=true when MediaRecorder is available", () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.state).toBe("idle");
    expect(result.current.supported).toBe(true);
    expect(result.current.blob).toBeNull();
    expect(result.current.durationSeconds).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it("transitions to requesting then recording after start()", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    // start() calls getUserMedia which is async — intercept before it resolves
    // to observe the "requesting" transient state
    let resolveMedia!: (v: MediaStream) => void;
    mockGetUserMedia.mockReturnValueOnce(
      new Promise<MediaStream>((res) => { resolveMedia = res; })
    );

    act(() => {
      void result.current.start();
    });

    // Still waiting for getUserMedia → should be requesting
    expect(result.current.state).toBe("requesting");

    // Now resolve getUserMedia
    await act(async () => {
      resolveMedia({ getTracks: () => [fakeTrack] } as unknown as MediaStream);
      await Promise.resolve(); // flush microtasks
    });

    expect(result.current.state).toBe("recording");
  });

  it("sets state to denied and errorMessage when getUserMedia is rejected", async () => {
    mockGetUserMedia.mockRejectedValueOnce(
      new DOMException("Permission denied", "NotAllowedError")
    );

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe("denied");
    expect(result.current.errorMessage).toBeTruthy();
    expect(result.current.errorMessage).toMatch(/micrófono/i);
  });

  it("stop() sets state to stopped and produces a blob + durationSeconds", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    // Start recording
    await act(async () => {
      await result.current.start();
    });

    expect(result.current.state).toBe("recording");

    // Advance clock so durationSeconds > 0
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Stop
    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe("stopped");
    expect(result.current.blob).toBeInstanceOf(Blob);
    expect(result.current.durationSeconds).toBeGreaterThanOrEqual(1);
  });

  it("cancel() discards the recording and returns to idle", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.cancel();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.blob).toBeNull();
    expect(result.current.durationSeconds).toBeNull();
    expect(result.current.elapsedSeconds).toBe(0);
  });

  it("reset() clears blob and returns to idle after a stop", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      result.current.stop();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.blob).toBeNull();
  });

  it("increments elapsedSeconds while recording", async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.elapsedSeconds).toBeGreaterThanOrEqual(3);
  });
});
