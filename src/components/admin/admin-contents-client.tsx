"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContentRow } from "@/components/admin/content-row";
import { SearchInput } from "@/components/shared/search-input";
import { FilterDropdown } from "@/components/shared/filter-dropdown";
import { SortDropdown } from "@/components/shared/sort-dropdown";
import { ListToolbar } from "@/components/shared/list-toolbar";
import { useDebounce } from "@/hooks/use-debounce";
import type { AdminContentsRow } from "@/lib/server/data/admin-contents";

const SORT_OPTIONS = [
  { label: "최신순", value: "newest" },
  { label: "오래된순", value: "oldest" },
  { label: "열람률 높은순", value: "read-high" },
  { label: "열람률 낮은순", value: "read-low" },
];

interface AdminContentsClientProps {
  contentList: AdminContentsRow[];
}

export function AdminContentsClient({ contentList }: AdminContentsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [sortValue, setSortValue] = useState("newest");

  const debouncedQuery = useDebounce(searchQuery);

  const categoryOptions = useMemo(() => {
    const names = Array.from(new Set(contentList.map((c) => c.categoryName)));
    return names.map((name) => ({ label: name, value: name }));
  }, [contentList]);

  const targetOptions = useMemo(() => {
    const labels = Array.from(
      new Set(contentList.flatMap((c) => c.targetLabels))
    );
    return labels.map((label) => ({ label, value: label }));
  }, [contentList]);

  const filtered = useMemo(() => {
    let result = contentList;

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
      case "oldest":
        result = [...result].reverse();
        break;
      case "read-high":
        result = [...result].sort((a, b) => b.readRate - a.readRate);
        break;
      case "read-low":
        result = [...result].sort((a, b) => a.readRate - b.readRate);
        break;
    }

    return result;
  }, [contentList, debouncedQuery, selectedCategories, selectedTargets, sortValue]);

  return (
    <>
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

      <Card className="overflow-x-auto">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>제목</TableHead>
              <TableHead className="w-32">카테고리</TableHead>
              <TableHead className="w-32">대상</TableHead>
              <TableHead className="w-24">생성일</TableHead>
              <TableHead className="w-20">열람률</TableHead>
              <TableHead className="w-20">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  검색 결과가 없습니다.
                </td>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <ContentRow
                  key={c.id}
                  id={c.id}
                  title={c.title}
                  categoryName={c.categoryName}
                  targetLabels={c.targetLabels}
                  createdAt={c.createdAt}
                  readRate={c.readRate}
                />
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </>
  );
}
