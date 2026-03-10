"use client";

import Link from "next/link";
import { Paperclip, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { ContentWithMeta } from "@/types/domain";

const CATEGORY_COLORS: Record<string, string> = {
  "사내 비전/문화": "bg-indigo-500/10 text-indigo-500",
  "업무 매뉴얼": "bg-blue-500/10 text-blue-500",
  "정책/규정": "bg-amber-500/10 text-amber-500",
  "시장 리서치/인사이트": "bg-emerald-500/10 text-emerald-500",
  온보딩: "bg-purple-500/10 text-purple-500",
  공지사항: "bg-rose-500/10 text-rose-500",
};

interface ContentCardProps {
  content: ContentWithMeta;
}

export function ContentCard({ content }: ContentCardProps) {
  const categoryName = content.category?.name ?? "";
  const categoryColor =
    CATEGORY_COLORS[categoryName] ?? "bg-muted text-muted-foreground";
  const visibleTargetLabels = content.targetLabels.slice(0, 2);
  const hiddenTargetCount = Math.max(content.targetLabels.length - visibleTargetLabels.length, 0);
  const targetSummary =
    visibleTargetLabels.length > 0
      ? `${visibleTargetLabels.join(" · ")}${hiddenTargetCount > 0 ? ` 외 ${hiddenTargetCount}명` : ""}`
      : "전체";
  const fullTargetLabel = content.targetLabels.length > 0 ? content.targetLabels.join(" · ") : "전체";

  return (
    <Link href={`/contents/${content.id}`} className="group block">
      <article
        className={cn(
          "relative flex h-full flex-col rounded-lg border border-border/50 bg-card p-5",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-md"
        )}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "border-0 text-[11px] font-medium",
              categoryColor
            )}
          >
            {categoryName}
          </Badge>
          <span
            className="inline-flex max-w-full items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            title={fullTargetLabel}
          >
            <span className="truncate">{targetSummary}</span>
          </span>
        </div>

        <h3 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-foreground group-hover:text-primary">
          {content.title}
        </h3>

        {content.summary && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {content.summaryType === "ai" && (
              <Sparkles className="mr-1 inline-block h-3 w-3 text-purple-400" />
            )}
            {content.summary}
          </p>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(content.createdAt)}
          </span>

          {content.fileCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              {content.fileCount}
            </span>
          )}

          <span className="ml-auto inline-flex items-center gap-1.5">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                content.isRead ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            <span
              className={cn(
                "text-[11px] font-medium",
                content.isRead
                  ? "text-emerald-600"
                  : "text-red-500"
              )}
            >
              {content.isRead ? "읽음" : "미읽음"}
            </span>
          </span>
        </div>
      </article>
    </Link>
  );
}
