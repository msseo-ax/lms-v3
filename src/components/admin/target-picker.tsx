"use client";

import { useState, useMemo } from "react";
import type { Division, User, TargetType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronRight, ChevronDown } from "lucide-react";

interface TargetPickerProps {
  divisions: Division[];
  users: User[];
  value: { type: TargetType; divisionIds: string[]; userIds: string[] };
  onChange: (value: { type: TargetType; divisionIds: string[]; userIds: string[] }) => void;
}

const TARGET_MODES: { value: TargetType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "division", label: "본부/부문" },
  { value: "user", label: "개인" },
];

export function TargetPicker({
  divisions,
  users,
  value,
  onChange,
}: TargetPickerProps) {
  const [mode, setMode] = useState<TargetType>(value.type);
  const [userSearch, setUserSearch] = useState("");
  const [divisionSearch, setDivisionSearch] = useState("");
  const [collapsedDivisions, setCollapsedDivisions] = useState<Set<string>>(new Set());

  const divisionUserCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      if (u.divisionId) {
        counts.set(u.divisionId, (counts.get(u.divisionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [users]);

  function handleModeChange(newMode: TargetType) {
    setMode(newMode);
    onChange({ ...value, type: newMode });
    setUserSearch("");
    setDivisionSearch("");
  }

  function toggleDivisionId(id: string) {
    const divisionIds = value.divisionIds.includes(id)
      ? value.divisionIds.filter((item) => item !== id)
      : [...value.divisionIds, id];
    onChange({ ...value, divisionIds });
  }

  function toggleUserId(id: string) {
    const userIds = value.userIds.includes(id)
      ? value.userIds.filter((item) => item !== id)
      : [...value.userIds, id];
    onChange({ ...value, userIds });
  }

  function removeDivisionId(id: string) {
    onChange({ ...value, divisionIds: value.divisionIds.filter((item) => item !== id) });
  }

  function removeUserId(id: string) {
    onChange({ ...value, userIds: value.userIds.filter((item) => item !== id) });
  }

  // Division mode filtering
  const filteredDivisions = divisionSearch.trim()
    ? divisions.filter((d) =>
        d.name.toLowerCase().includes(divisionSearch.toLowerCase())
      )
    : divisions;

  // Division mode: select/deselect all visible
  function selectAllDivisions() {
    const visibleIds = filteredDivisions.map((d) => d.id);
    const merged = Array.from(new Set([...value.divisionIds, ...visibleIds]));
    onChange({ ...value, divisionIds: merged });
  }

  function deselectAllDivisions() {
    const visibleIds = new Set(filteredDivisions.map((d) => d.id));
    onChange({ ...value, divisionIds: value.divisionIds.filter((id) => !visibleIds.has(id)) });
  }

  const allVisibleSelected = filteredDivisions.length > 0 && filteredDivisions.every((d) => value.divisionIds.includes(d.id));

  // User mode filtering
  const filteredUsers = userSearch.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
          u.email.toLowerCase().includes(userSearch.toLowerCase())
      )
    : users;

  const assignedUsers = filteredUsers.filter((u) => u.divisionId);
  const unassignedUsers = filteredUsers.filter((u) => !u.divisionId);
  const selectedDivisionSet = new Set(value.divisionIds);

  function isIncludedByDivision(user: User) {
    return Boolean(user.divisionId && selectedDivisionSet.has(user.divisionId));
  }

  // User mode: toggle section expand
  function toggleSection(key: string) {
    setCollapsedDivisions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const isSearching = userSearch.trim().length > 0;

  function isSectionExpanded(key: string) {
    if (isSearching) return true;
    return !collapsedDivisions.has(key);
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {TARGET_MODES.map((m) => (
          <Button
            key={m.value}
            type="button"
            variant={mode === m.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleModeChange(m.value)}
          >
            {m.label}
          </Button>
        ))}
      </div>

      {mode === "division" && (
        <div className="space-y-3 rounded-md border border-input p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="본부/부문 검색"
              value={divisionSearch}
              onChange={(e) => setDivisionSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={allVisibleSelected ? deselectAllDivisions : selectAllDivisions}
            >
              {allVisibleSelected ? "전체 해제" : "전체 선택"}
            </Button>
          </div>

          {filteredDivisions.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 sm:gap-3">
              {filteredDivisions.map((div) => {
                const count = divisionUserCounts.get(div.id) ?? 0;
                return (
                  <label
                    key={div.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <Checkbox
                      checked={value.divisionIds.includes(div.id)}
                      onCheckedChange={() => toggleDivisionId(div.id)}
                    />
                    <span className="text-sm">{div.name} ({count}명)</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "user" && (
        <div className="rounded-md border border-input p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="이름 또는 이메일 검색"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">

          {filteredUsers.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}

          {divisions.map((div) => {
            const divUsers = assignedUsers.filter((u) => u.divisionId === div.id);
            if (divUsers.length === 0) return null;
            const selectedCount = divUsers.filter(
              (u) => value.userIds.includes(u.id) || isIncludedByDivision(u)
            ).length;
            const expanded = isSectionExpanded(div.id);
            return (
              <div key={div.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-muted/50"
                  onClick={() => toggleSection(div.id)}
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {div.name} ({divUsers.length}명)
                    {selectedCount > 0 && ` · ${selectedCount}명 선택`}
                  </span>
                </button>
                {expanded && (
                  <div className="grid grid-cols-2 gap-2 pl-5 pt-1 sm:grid-cols-3 md:grid-cols-4">
                    {divUsers.map((user) => {
                      const includedByDivision = isIncludedByDivision(user);
                      const explicitlySelected = value.userIds.includes(user.id);
                      const checked = includedByDivision || explicitlySelected;
                      return (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={includedByDivision && !explicitlySelected}
                            onCheckedChange={() => toggleUserId(user.id)}
                          />
                          <span className="text-sm">{user.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {unassignedUsers.length > 0 && (() => {
            const sectionKey = "__unassigned__";
            const selectedCount = unassignedUsers.filter(
              (u) => value.userIds.includes(u.id) || isIncludedByDivision(u)
            ).length;
            const expanded = isSectionExpanded(sectionKey);
            return (
              <div>
                <button
                  type="button"
                  className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-muted/50"
                  onClick={() => toggleSection(sectionKey)}
                >
                  {expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-xs font-medium text-muted-foreground">
                    {assignedUsers.length > 0 ? "미분류" : "전체 구성원"} ({unassignedUsers.length}명)
                    {selectedCount > 0 && ` · ${selectedCount}명 선택`}
                  </span>
                </button>
                {expanded && (
                  <div className="grid grid-cols-2 gap-2 pl-5 pt-1 sm:grid-cols-3 md:grid-cols-4">
                    {unassignedUsers.map((user) => {
                      const includedByDivision = isIncludedByDivision(user);
                      const explicitlySelected = value.userIds.includes(user.id);
                      const checked = includedByDivision || explicitlySelected;
                      return (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={includedByDivision && !explicitlySelected}
                            onCheckedChange={() => toggleUserId(user.id)}
                          />
                          <span className="text-sm">{user.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          </div>
        </div>
      )}

      {mode === "all" && (
        <p className="text-sm text-muted-foreground">
          전체 구성원에게 콘텐츠가 배포됩니다.
        </p>
      )}

      {(value.divisionIds.length > 0 || value.userIds.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {value.divisionIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {divisions.find((d) => d.id === id)?.name ?? id}
              <button
                type="button"
                onClick={() => removeDivisionId(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {value.userIds.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {users.find((u) => u.id === id)?.name ?? id}
              <button
                type="button"
                onClick={() => removeUserId(id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
