"use client";

import { useEffect, useMemo, useState } from "react";
import type { Category } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";

export default function CategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const sortedCats = useMemo(
    () => [...cats].sort((a, b) => a.sortOrder - b.sortOrder),
    [cats]
  );

  useEffect(() => {
    void fetchCategories();
  }, []);

  async function fetchCategories() {
    setLoading(true);
    try {
      const response = await fetch("/api/categories", { cache: "no-store" });
      const data = (await response.json()) as Category[] | { error?: string };
      if (!response.ok || !Array.isArray(data)) {
        alert((data as { error?: string }).error ?? "카테고리를 불러오지 못했습니다.");
        return;
      }
      setCats(data);
    } catch {
      alert("카테고리 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newName.trim() || !newSlug.trim()) return;
    setSaving(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim().toLowerCase().replace(/\s+/g, "-"),
        }),
      });

      const data = (await response.json()) as Category | { error?: string };
      if (!response.ok) {
        alert((data as { error?: string }).error ?? "카테고리 추가에 실패했습니다.");
        return;
      }

      setCats((prev) => [...prev, data as Category]);
      setNewName("");
      setNewSlug("");
    } catch {
      alert("카테고리 추가 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmed = window.confirm("이 카테고리를 삭제하시겠습니까?");
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        alert(data.error ?? "카테고리 삭제에 실패했습니다.");
        return;
      }
      setCats((prev) => prev.filter((item) => item.id !== id));
    } catch {
      alert("카테고리 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleEditSave() {
    if (!editId || !editName.trim()) return;
    const original = cats.find((item) => item.id === editId);
    if (!original) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/categories/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          slug: original.slug,
          sortOrder: original.sortOrder,
        }),
      });

      const data = (await response.json()) as Category | { error?: string };
      if (!response.ok) {
        alert((data as { error?: string }).error ?? "카테고리 수정에 실패했습니다.");
        return;
      }

      setCats((prev) =>
        prev.map((item) => (item.id === editId ? (data as Category) : item))
      );
      setEditId(null);
      setEditName("");
    } catch {
      alert("카테고리 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">카테고리 관리</h1>
          <p className="text-muted-foreground mt-1">콘텐츠 분류를 위한 카테고리를 관리합니다</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              카테고리 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>새 카테고리 추가</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">카테고리명</Label>
                <Input
                  id="cat-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 사내 비전/문화"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-slug">슬러그</Label>
                <Input
                  id="cat-slug"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="예: vision-culture"
                />
              </div>
              <DialogClose asChild>
                <Button onClick={handleAdd} className="w-full" disabled={saving}>
                  추가
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" />
            카테고리 목록 ({sortedCats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">불러오는 중...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">순서</TableHead>
                  <TableHead>카테고리명</TableHead>
                  <TableHead>슬러그</TableHead>
                  <TableHead className="w-24 text-right">액션</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCats.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-mono text-muted-foreground">{cat.sortOrder}</TableCell>
                    <TableCell>
                      {editId === cat.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                            onKeyDown={(e) => e.key === "Enter" && void handleEditSave()}
                          />
                          <Button size="sm" variant="ghost" onClick={() => void handleEditSave()}>
                            저장
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{cat.name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{cat.slug}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditId(cat.id);
                            setEditName(cat.name);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => void handleDelete(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
