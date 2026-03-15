"use client";

import { useMemo, useState } from "react";
import type { Category, ContentWithMeta } from "@/types/domain";
import { ContentCard } from "./content-card";
import { SearchInput } from "@/components/shared/search-input";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { useDebounce } from "@/hooks/use-debounce";

interface FeedFiltersProps {
  contents: ContentWithMeta[];
  categories: Category[];
}

const READ_STATUS_OPTIONS = [
  { label: "열람완료", value: "completed" },
  { label: "열람중", value: "reading" },
  { label: "미열람", value: "unread" },
];

const SORT_OPTIONS = [
  { label: "최신순", value: "newest" },
  { label: "오래된순", value: "oldest" },
];

export function FeedFilters({ contents, categories }: FeedFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedReadStatus, setSelectedReadStatus] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("newest");

  const debouncedQuery = useDebounce(searchQuery);

  const categoryOptions = useMemo(
    () => categories.map((cat) => ({ label: cat.name, value: cat.id })),
    [categories]
  );

  const filtered = useMemo(() => {
    let result = contents;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((c) => selectedCategories.includes(c.categoryId));
    }

    if (selectedReadStatus.length > 0) {
      result = result.filter((c) => selectedReadStatus.includes(c.readStatus));
    }

    if (sortValue === "oldest") {
      result = [...result].reverse();
    }

    return result;
  }, [contents, debouncedQuery, selectedCategories, selectedReadStatus, sortValue]);

  return (
    <>
      <div className="mb-6">
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
            label="열람상태"
            options={READ_STATUS_OPTIONS}
            selected={selectedReadStatus}
            onChange={setSelectedReadStatus}
          />
          <div className="ml-auto">
            <SortDropdown
              options={SORT_OPTIONS}
              value={sortValue}
              onChange={setSortValue}
            />
          </div>
        </ListToolbar>
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
