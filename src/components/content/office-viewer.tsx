"use client";

import { useState, useEffect } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface OfficeViewerProps {
  accessUrl: string;
  fileName: string;
}

export function OfficeViewer({ accessUrl, fileName }: OfficeViewerProps) {
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      try {
        const sep = accessUrl.includes("?") ? "&" : "?";
        const res = await fetch(`${accessUrl}${sep}resolve=true`, {
          redirect: "manual",
        });

        if (cancelled) return;

        // If we got a redirect instead of JSON, the resolve param wasn't handled
        if (res.type === "opaqueredirect" || !res.ok) {
          throw new Error("Failed to resolve URL");
        }

        const data = (await res.json()) as { url: string };
        if (cancelled) return;

        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.url)}`;
        setViewerUrl(officeUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [accessUrl]);

  if (loading) {
    return (
      <div className="mt-2 flex items-center justify-center rounded-lg border bg-slate-50 py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          문서 뷰어 로딩 중...
        </span>
      </div>
    );
  }

  if (error || !viewerUrl) {
    return (
      <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border bg-slate-50 py-8">
        <AlertCircle className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          미리보기를 불러올 수 없습니다. 파일을 다운로드하여 확인해주세요.
        </span>
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-lg border overflow-hidden">
      <iframe
        src={viewerUrl}
        title={fileName}
        className="w-full h-[50vh] sm:h-[600px]"
        allowFullScreen
      />
    </div>
  );
}
