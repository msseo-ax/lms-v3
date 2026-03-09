"use client";

import { useEffect, useRef } from "react";

interface ReadTrackerProps {
  contentId: string;
}

export function ReadTracker({ contentId }: ReadTrackerProps) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    function sendDuration() {
      const durationSeconds = Math.round(
        (Date.now() - startTimeRef.current) / 1000
      );
      if (durationSeconds < 1) return;

      const body = JSON.stringify({ contentId, durationSeconds });

      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/readlogs",
          new Blob([body], { type: "application/json" })
        );
      } else {
        fetch("/api/readlogs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
          keepalive: true,
        });
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        sendDuration();
      } else {
        startTimeRef.current = Date.now();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendDuration();
    };
  }, [contentId]);

  return null;
}
