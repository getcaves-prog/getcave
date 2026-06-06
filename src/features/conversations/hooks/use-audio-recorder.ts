"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────

export type AudioRecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "denied";

export interface AudioRecorderResult {
  state: AudioRecorderState;
  /** Elapsed seconds while recording (updated every second). */
  elapsedSeconds: number;
  /** Set after stop() is called successfully. */
  blob: Blob | null;
  /** Duration in seconds of the recorded audio (set after stop). */
  durationSeconds: number | null;
  /** Non-null when getUserMedia is denied or any error occurs. */
  errorMessage: string | null;
  /** True when MediaRecorder API is available in this environment. */
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
}

// ─── Feature detect ────────────────────────────────────────────────────────
// MediaRecorder is a browser API — guard for SSR and unsupported browsers.
const isMediaRecorderSupported =
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  typeof navigator !== "undefined" &&
  typeof navigator.mediaDevices?.getUserMedia === "function";

// ─── MIME preference list ─────────────────────────────────────────────────
// Try webm/opus first (Chromium), fall back to webm, then audio/mp4 (Safari).
function getSupportedMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return ""; // Let the browser choose
}

// ─── useAudioRecorder ─────────────────────────────────────────────────────
export function useAudioRecorder(): AudioRecorderResult {
  const [state, setState] = useState<AudioRecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup helper ───────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
    };
  }, [stopStream]);

  // ── start ────────────────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!isMediaRecorderSupported) return;

    setErrorMessage(null);
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      // NotAllowedError → permission denied; anything else → generic error
      setState("denied");
      setErrorMessage("Permití el micrófono para enviar audio.");
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mime = getSupportedMime();
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      const recordedBlob = new Blob(chunksRef.current, {
        type: mime || "audio/webm",
      });
      setBlob(recordedBlob);
      setDurationSeconds(duration);
      stopStream();
    };

    startTimeRef.current = Date.now();
    recorder.start(250); // collect chunks every 250ms
    setState("recording");
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [stopStream]);

  // ── stop ─────────────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
      setState("stopped");
    }
  }, []);

  // ── cancel ───────────────────────────────────────────────────────────────
  const cancel = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      // Override onstop so we don't emit a blob
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    stopStream();
    chunksRef.current = [];
    setBlob(null);
    setDurationSeconds(null);
    setElapsedSeconds(0);
    setState("idle");
    setErrorMessage(null);
  }, [stopStream]);

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    chunksRef.current = [];
    setBlob(null);
    setDurationSeconds(null);
    setElapsedSeconds(0);
    setState("idle");
    setErrorMessage(null);
  }, []);

  return {
    state,
    elapsedSeconds,
    blob,
    durationSeconds,
    errorMessage,
    supported: isMediaRecorderSupported,
    start,
    stop,
    cancel,
    reset,
  };
}
