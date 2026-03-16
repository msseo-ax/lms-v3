"use client";

import { useEffect, useState } from "react";

interface VideoPlayerProps {
  accessUrl: string;
  className?: string;
}

export function VideoPlayer({ accessUrl, className }: VideoPlayerProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const sep = accessUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${accessUrl}${sep}resolve=true`);
        if (!res.ok) throw new Error("Failed to resolve video URL");
        const data = await res.json();
        if (!cancelled) setSrc(data.url);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [accessUrl]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-100 text-sm text-muted-foreground rounded-lg">
        동영상을 불러올 수 없습니다.
      </div>
    );
  }

  if (!src) {
    return (
      <div className="flex items-center justify-center h-48 bg-slate-100 rounded-lg">
        <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full" />
      </div>
    );
  }

  return (
    <video
      src={src}
      controls
      playsInline
      preload="metadata"
      className={className ?? "w-full"}
    >
      <track kind="captions" />
    </video>
  );
}
