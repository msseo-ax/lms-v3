"use client";

import { useEffect, useRef } from "react";

interface ReadTrackerProps {
  contentId: string;
}

export function ReadTracker({ contentId }: ReadTrackerProps) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    fetch("/api/readlogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentId }),
    }).catch(() => {});
  }, [contentId]);

  return null;
}
