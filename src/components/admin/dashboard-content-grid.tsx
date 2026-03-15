"use client";

import { useMemo, useState } from "react";
import { ReadStatusCard } from "@/components/admin/read-status-card";
import { SearchInput } from "@/components/shared/search-input";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { useDebounce } from "@/hooks/use-debounce";
import type { User } from "@/types/domain";

interface DashboardContentRow {
  id: string;
  title: string;
  readRate: number;
  targetLabels: string[];
  categoryName: string;
  completedCount: number;
  readingCount: number;
  totalCount: number;
  incompleteUsers: User[];
}

const SORT_OPTIONS = [
  { label: "열람률 낮은순", value: "read-low" },
  { label: "열람률 높은순", value: "read-high" },
];

interface DashboardContentGridProps {
  contentData: DashboardContentRow[];
}

export function DashboardContentGrid({ contentData }: DashboardContentGridProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("read-low");

  const debouncedQuery = useDebounce(searchQuery);

  const categoryOptions = useMemo(() => {
    const names = Array.from(new Set(contentData.map((c) => c.categoryName)));
    return names.map((name) => ({ label: name, value: name }));
  }, [contentData]);

  const targetOptions = useMemo(() => {
    const labels = Array.from(new Set(contentData.flatMap((c) => c.targetLabels)));
    return labels.map((label) => ({ label, value: label }));
  }, [contentData]);

  const filtered = useMemo(() => {
    let result = contentData;

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }

    if (selectedCategories.length > 0) {
      result = result.filter((c) => selectedCategories.includes(c.categoryName));
    }

    if (selectedTargets.length > 0) {
      result = result.filter((c) =>
        c.targetLabels.some((label) => selectedTargets.includes(label))
      );
    }

    switch (sortValue) {
      case "read-high":
        result = [...result].sort((a, b) => b.readRate - a.readRate);
        break;
      case "read-low":
        result = [...result].sort((a, b) => a.readRate - b.readRate);
        break;
    }

    return result;
  }, [contentData, debouncedQuery, selectedCategories, selectedTargets, sortValue]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">콘텐츠별 열람 현황</h2>

      <ListToolbar>
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="제목 검색..."
          className="w-full sm:w-64"
        />
        <FilterDropdown
          label="카테고리"
          options={categoryOptions}
          selected={selectedCategories}
          onChange={setSelectedCategories}
        />
        <FilterDropdown
          label="대상"
          options={targetOptions}
          selected={selectedTargets}
          onChange={setSelectedTargets}
        />
        <div className="ml-auto">
          <SortDropdown
            options={SORT_OPTIONS}
            value={sortValue}
            onChange={setSortValue}
          />
        </div>
      </ListToolbar>

      <div className="grid grid-cols-1 gap-3 mt-4 sm:grid-cols-2 sm:gap-4">
        {filtered.length === 0 ? (
          <p className="col-span-2 py-12 text-center text-sm text-muted-foreground">
            검색 결과가 없습니다.
          </p>
        ) : (
          filtered.map((contentRow) => (
            <ReadStatusCard
              key={contentRow.id}
              contentId={contentRow.id}
              title={contentRow.title}
              categoryName={contentRow.categoryName}
              readRate={contentRow.readRate}
              completedCount={contentRow.completedCount}
              readingCount={contentRow.readingCount}
              totalCount={contentRow.totalCount}
              targetLabels={contentRow.targetLabels}
              incompleteUsers={contentRow.incompleteUsers}
            />
          ))
        )}
      </div>
    </div>
  );
}
