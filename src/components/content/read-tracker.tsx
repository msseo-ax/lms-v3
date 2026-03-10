"use client";

import { useEffect, useRef } from "react";

interface ReadTrackerProps {
  contentId: string;
}

export function ReadTracker({ contentId }: ReadTrackerProps) {
  const checkpointRef = useRef<number>(Date.now());

  useEffect(() => {
    checkpointRef.current = Date.now();

    function sendDuration(allowWhenHidden = false) {
      const now = Date.now();

      if (!allowWhenHidden && document.visibilityState !== "visible") {
        checkpointRef.current = now;
        return;
      }

      const durationSeconds = Math.round((now - checkpointRef.current) / 1000);
      if (durationSeconds < 1) {
        checkpointRef.current = now;
        return;
      }

      checkpointRef.current = now;

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
        sendDuration(true);
      } else {
        checkpointRef.current = Date.now();
      }
    }

    const initialTimer = window.setTimeout(() => {
      sendDuration(false);
    }, 2000);

    const periodicTimer = window.setInterval(() => {
      sendDuration(false);
    }, 30000);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(periodicTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      sendDuration(false);
    };
  }, [contentId]);

  return null;
}
