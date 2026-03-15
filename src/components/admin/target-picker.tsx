"use client";

import { useState } from "react";
import type { Division, User, TargetType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, X } from "lucide-react";

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

  function handleModeChange(newMode: TargetType) {
    setMode(newMode);
    onChange({ ...value, type: newMode });
    setUserSearch("");
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
        <div className="grid grid-cols-3 gap-3 rounded-md border border-input p-3">
          {divisions.map((div) => (
            <label
              key={div.id}
              className="flex cursor-pointer items-center gap-2"
            >
              <Checkbox
                checked={value.divisionIds.includes(div.id)}
                onCheckedChange={() => toggleDivisionId(div.id)}
              />
              <span className="text-sm">{div.name}</span>
            </label>
          ))}
        </div>
      )}

      {mode === "user" && (
        <div className="space-y-4 rounded-md border border-input p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="이름 또는 이메일 검색"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 pl-8 text-sm"
            />
          </div>

          {filteredUsers.length === 0 && (
            <p className="py-2 text-center text-sm text-muted-foreground">
              검색 결과가 없습니다.
            </p>
          )}

          {divisions.map((div) => {
            const divUsers = assignedUsers.filter((u) => u.divisionId === div.id);
            if (divUsers.length === 0) return null;
            return (
              <div key={div.id}>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  {div.name}
                </Label>
                <div className="grid grid-cols-4 gap-2">
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
              </div>
            );
          })}

          {unassignedUsers.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {assignedUsers.length > 0 ? "미분류" : "전체 구성원"}
              </Label>
              <div className="grid grid-cols-4 gap-2">
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
            </div>
          )}
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
