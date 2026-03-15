"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, FileText } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/search-input";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { useDebounce } from "@/hooks/use-debounce";

interface IncompleteContent {
  id: string;
  title: string;
  categoryId: string;
  summary: string | null;
  createdAt: string;
  targetLabels: string[];
  fileCount: number;
  readStatus: "unread" | "reading" | "completed";
}

interface Category {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { label: "미열람", value: "unread" },
  { label: "열람중", value: "reading" },
];

const SORT_OPTIONS = [
  { label: "최신순", value: "newest" },
  { label: "오래된순", value: "oldest" },
];

interface MyPageContentsProps {
  contents: IncompleteContent[];
  categories: Category[];
}

export function MyPageContents({ contents, categories }: MyPageContentsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("newest");

  const debouncedQuery = useDebounce(searchQuery);

  const categoryOptions = useMemo(() => {
    const usedCategoryIds = new Set(contents.map((c) => c.categoryId));
    return categories
      .filter((cat) => usedCategoryIds.has(cat.id))
      .map((cat) => ({ label: cat.name, value: cat.id }));
  }, [contents, categories]);

  const filtered = useMemo(() => {
    let result = contents;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((c) => selectedCategories.includes(c.categoryId));
    }

    if (selectedStatuses.length > 0) {
      result = result.filter((c) => selectedStatuses.includes(c.readStatus));
    }

    if (sortValue === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [contents, debouncedQuery, selectedCategories, selectedStatuses, sortValue]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">미완료 콘텐츠</h2>

      {contents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <Eye className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            <p>모든 콘텐츠를 열람 완료했습니다!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <ListToolbar>
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="제목 검색..."
              className="w-64"
            />
            <FilterDropdown
              label="카테고리"
              options={categoryOptions}
              selected={selectedCategories}
              onChange={setSelectedCategories}
            />
            <FilterDropdown
              label="상태"
              options={STATUS_OPTIONS}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
            />
            <div className="ml-auto">
              <SortDropdown
                options={SORT_OPTIONS}
                value={sortValue}
                onChange={setSortValue}
              />
            </div>
          </ListToolbar>

          <div className="space-y-3 mt-4">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                검색 결과가 없습니다.
              </p>
            ) : (
              filtered.map((content) => {
                const category = categories.find((item) => item.id === content.categoryId);
                return (
                  <Link key={content.id} href={`/contents/${content.id}`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-sm">{content.title}</h3>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <Badge variant="secondary" className="text-xs">
                                {category?.name}
                              </Badge>
                              {content.targetLabels.map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className="text-[11px] px-1.5 py-0"
                                >
                                  {label}
                                </Badge>
                              ))}
                              {content.fileCount > 0 && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <FileText className="h-3 w-3" />
                                  {content.fileCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(content.createdAt)}
                            </span>
                            <span className={cn(
                              "text-[11px] font-medium",
                              content.readStatus === "reading" ? "text-orange-600" : "text-red-500"
                            )}>
                              {content.readStatus === "reading" ? "열람중" : "미열람"}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
