"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import type { User } from "@/types/domain";

interface ReadStatusCardProps {
  contentId: string;
  title: string;
  categoryName: string;
  readRate: number;
  readCount: number;
  totalCount: number;
  targetLabels: string[];
  unreadUsers: User[];
}

export function ReadStatusCard({
  contentId,
  title,
  categoryName,
  readRate,
  readCount,
  totalCount,
  targetLabels,
  unreadUsers,
}: ReadStatusCardProps) {
  const [isSending, setIsSending] = useState(false);

  async function handleSendReminder() {
    if (unreadUsers.length === 0 || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch("/api/slack/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId }),
      });

      const data = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) {
        alert(data.error ?? "슬랙 리마인드 전송에 실패했습니다.");
        return;
      }

      alert(data.message ?? "슬랙 리마인드가 전송되었습니다.");
    } catch {
      alert("슬랙 리마인드 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight">{title}</h3>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {categoryName}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {targetLabels.map((label) => (
            <Badge
              key={label}
              variant="outline"
              className="text-[11px] px-1.5 py-0"
            >
              {label}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={readRate} className="flex-1 h-2" />
          <span
            className={cn(
              "text-sm font-semibold tabular-nums w-12 text-right",
              readRate >= 80
                ? "text-emerald-600"
                : readRate >= 50
                  ? "text-amber-600"
                  : "text-red-500"
            )}
          >
            {readRate}%
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {readCount}명 읽음
          </span>
          <span>{totalCount}명 대상</span>
        </div>
        {unreadUsers.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center justify-between gap-2 select-none">
              <span className="inline-flex items-center gap-1">
                <EyeOff className="h-3 w-3" />
                미열람 {unreadUsers.length}명 보기
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[11px]"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleSendReminder();
                }}
                disabled={isSending}
              >
                {isSending ? "전송 중..." : "슬랙 리마인드"}
              </Button>
            </summary>
            <div className="mt-2 space-y-1 pl-4 border-l-2 border-muted">
              {unreadUsers.map((u) => (
                <div key={u.id} className="text-xs text-muted-foreground">
                  {u.name}
                  <span className="text-muted-foreground/60 ml-1">
                    ({u.email})
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
