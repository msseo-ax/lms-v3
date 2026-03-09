"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Category, ContentWithMeta } from "@/types/domain";
import { ContentCard } from "./content-card";

interface FeedFiltersProps {
  contents: ContentWithMeta[];
  categories: Category[];
}

const READ_STATUS_OPTIONS = [
  { label: "전체", value: "all" },
  { label: "읽음", value: "read" },
  { label: "미읽음", value: "unread" },
] as const;

type ReadStatusValue = (typeof READ_STATUS_OPTIONS)[number]["value"];

export function FeedFilters({ contents, categories }: FeedFiltersProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [readStatus, setReadStatus] = useState<ReadStatusValue>("all");

  const filtered = contents.filter((c) => {
    if (activeCategoryId !== "all" && c.categoryId !== activeCategoryId) {
      return false;
    }
    if (readStatus === "read" && !c.isRead) return false;
    if (readStatus === "unread" && c.isRead) return false;
    return true;
  });

  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={activeCategoryId === "all"}
            onClick={() => setActiveCategoryId("all")}
          >
            전체
          </FilterPill>
          {categories.map((cat) => (
            <FilterPill
              key={cat.id}
              active={activeCategoryId === cat.id}
              onClick={() => setActiveCategoryId(cat.id)}
            >
              {cat.name}
            </FilterPill>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {READ_STATUS_OPTIONS.map((opt) => (
            <FilterPill
              key={opt.value}
              active={readStatus === opt.value}
              onClick={() => setReadStatus(opt.value)}
              size="sm"
            >
              {opt.label}
            </FilterPill>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-20 text-center text-sm text-muted-foreground">
          해당 조건에 맞는 콘텐츠가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((content) => (
            <ContentCard key={content.id} content={content} />
          ))}
        </div>
      )}
    </>
  );
}

function FilterPill({
  active,
  onClick,
  size = "default",
  children,
}: {
  active: boolean;
  onClick: () => void;
  size?: "default" | "sm";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border font-medium transition-colors",
        size === "sm" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {children}
    </button>
  );
}
