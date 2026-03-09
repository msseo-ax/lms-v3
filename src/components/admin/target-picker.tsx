"use client";

import { useState } from "react";
import type { Division, Team, User, TargetType } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface TargetPickerProps {
  divisions: Division[];
  teams: Team[];
  users: User[];
  value: { type: TargetType; ids: string[] };
  onChange: (value: { type: TargetType; ids: string[] }) => void;
}

const TARGET_MODES: { value: TargetType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "division", label: "본부 선택" },
  { value: "team", label: "팀 선택" },
  { value: "user", label: "개인 선택" },
];

export function TargetPicker({
  divisions,
  teams,
  users,
  value,
  onChange,
}: TargetPickerProps) {
  const [mode, setMode] = useState<TargetType>(value.type);

  function handleModeChange(newMode: TargetType) {
    setMode(newMode);
    onChange({ type: newMode, ids: newMode === "all" ? [] : [] });
  }

  function toggleId(id: string) {
    const ids = value.ids.includes(id)
      ? value.ids.filter((i) => i !== id)
      : [...value.ids, id];
    onChange({ type: mode, ids });
  }

  function removeId(id: string) {
    onChange({ type: mode, ids: value.ids.filter((i) => i !== id) });
  }

  function getLabel(id: string): string {
    if (mode === "division") return divisions.find((d) => d.id === id)?.name ?? id;
    if (mode === "team") return teams.find((t) => t.id === id)?.name ?? id;
    if (mode === "user") return users.find((u) => u.id === id)?.name ?? id;
    return id;
  }

  const nonAdminUsers = users.filter((u) => u.role !== "admin");

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
                checked={value.ids.includes(div.id)}
                onCheckedChange={() => toggleId(div.id)}
              />
              <span className="text-sm">{div.name}</span>
            </label>
          ))}
        </div>
      )}

      {mode === "team" && (
        <div className="space-y-3 rounded-md border border-input p-3">
          {divisions.map((div) => {
            const divTeams = teams.filter((t) => t.divisionId === div.id);
            if (divTeams.length === 0) return null;
            return (
              <div key={div.id}>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  {div.name}
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {divTeams.map((team) => (
                    <label
                      key={team.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={value.ids.includes(team.id)}
                        onCheckedChange={() => toggleId(team.id)}
                      />
                      <span className="text-sm">{team.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "user" && (
        <div className="space-y-3 rounded-md border border-input p-3">
          {divisions.map((div) => {
            const divUsers = nonAdminUsers.filter((u) => u.divisionId === div.id);
            if (divUsers.length === 0) return null;
            return (
              <div key={div.id}>
                <Label className="mb-1.5 block text-xs text-muted-foreground">
                  {div.name}
                </Label>
                <div className="grid grid-cols-4 gap-2">
                  {divUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={value.ids.includes(user.id)}
                        onCheckedChange={() => toggleId(user.id)}
                      />
                      <span className="text-sm">{user.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "all" && (
        <p className="text-sm text-muted-foreground">
          전체 구성원에게 콘텐츠가 배포됩니다.
        </p>
      )}

      {value.ids.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.ids.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {getLabel(id)}
              <button
                type="button"
                onClick={() => removeId(id)}
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
