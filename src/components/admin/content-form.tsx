"use client";

import { useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Category, Division, Team, User, TargetType, SummaryType } from "@/types/domain";
import { cn, formatFileSize } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  X,
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { TargetPicker } from "@/components/admin/target-picker";

const RichEditor = dynamic(
  () => import("@/components/admin/rich-editor").then((mod) => mod.RichEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center rounded-md border border-input min-h-[240px]">
        <p className="text-sm text-muted-foreground">에디터 로딩 중...</p>
      </div>
    ),
  }
);

interface ContentFormProps {
  categories: Category[];
  divisions: Division[];
  teams: Team[];
  users: User[];
  mode?: "create" | "edit";
  contentId?: string;
  initialValues?: {
    title: string;
    categoryId: string;
    body: string;
    summary: string;
    summaryType: SummaryType;
    targets: { targetType: TargetType; targetId: string | null }[];
  };
}

interface UploadedFile {
  file: File;
  id: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];
const MAX_FILE_SIZE = 300 * 1024 * 1024;

function getFileIcon(file: File) {
  if (file.type === "application/pdf") return FileText;
  if (file.type.includes("word")) return FileText;
  if (file.type.startsWith("video/")) return Film;
  if (file.type.startsWith("image/")) return ImageIcon;
  return FileText;
}

function getFileTypeLabel(file: File): string {
  if (file.type === "application/pdf") return "PDF";
  if (file.type.includes("word")) return "DOCX";
  if (file.type.startsWith("video/")) return "MP4";
  if (file.type.startsWith("image/")) return "이미지";
  return "파일";
}

function deriveInitialTarget(
  targets: { targetType: TargetType; targetId: string | null }[] | undefined
): { type: TargetType; ids: string[] } {
  if (!targets || targets.length === 0) {
    return { type: "all", ids: [] };
  }

  if (targets.some((t) => t.targetType === "all")) {
    return { type: "all", ids: [] };
  }

  const firstType = targets[0].targetType;
  return {
    type: firstType,
    ids: targets
      .filter((t) => t.targetType === firstType)
      .map((t) => t.targetId)
      .filter((id): id is string => Boolean(id)),
  };
}

export function ContentForm({
  categories,
  divisions,
  teams,
  users,
  mode = "create",
  contentId,
  initialValues,
}: ContentFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [categoryId, setCategoryId] = useState(initialValues?.categoryId ?? "");
  const [target, setTarget] = useState<{ type: TargetType; ids: string[] }>(() =>
    deriveInitialTarget(initialValues?.targets)
  );
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [summaryMode, setSummaryMode] = useState<SummaryType>(
    initialValues?.summaryType ?? "manual"
  );
  const [summary, setSummary] = useState(initialValues?.summary ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [links, setLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const valid = Array.from(newFiles).filter((f) => {
      if (!ACCEPTED_TYPES.includes(f.type)) return false;
      if (f.size > MAX_FILE_SIZE) return false;
      return true;
    });
    setFiles((prev) => [
      ...prev,
      ...valid.map((file) => ({ file, id: crypto.randomUUID() })),
    ]);
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  function addLink() {
    const trimmed = linkInput.trim();
    if (!trimmed) return;
    try {
      new URL(trimmed);
      setLinks((prev) => [...prev, trimmed]);
      setLinkInput("");
    } catch {
      alert("올바른 URL 형식을 입력해주세요.");
    }
  }

  function removeLink(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleGenerateAiSummary() {
    if (!body.trim()) {
      alert("본문을 먼저 입력해주세요.");
      return;
    }

    setIsGeneratingSummary(true);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: body }),
      });

      const data = (await response.json()) as { summary?: string; error?: string };
      if (!response.ok) {
        alert(data.error ?? "AI 요약 생성에 실패했습니다.");
        return;
      }

      setSummary(data.summary ?? "");
    } catch {
      alert("AI 요약 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!categoryId) {
      alert("카테고리를 선택해주세요.");
      return;
    }

    const targets =
      target.type === "all"
        ? [{ targetType: "all", targetId: null }]
        : target.ids.map((id) => ({ targetType: target.type, targetId: id }));

    if (target.type !== "all" && targets.length === 0) {
      alert("배포 대상을 1개 이상 선택해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = mode === "edit" ? `/api/contents/${contentId}` : "/api/contents";
      const method = mode === "edit" ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          categoryId,
          body,
          summary,
          summaryType: summaryMode,
          targets,
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        alert(data.error ?? "저장에 실패했습니다.");
        return;
      }

      alert(mode === "edit" ? "콘텐츠가 수정되었습니다." : "콘텐츠가 등록되었습니다.");
      router.push("/admin/contents");
      router.refresh();
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "edit" ? "콘텐츠 수정" : "콘텐츠 등록"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "edit"
              ? "기존 콘텐츠를 수정하고 배포 대상을 업데이트합니다."
              : "새로운 콘텐츠를 작성하고 대상 구성원에게 배포합니다."}
          </p>
        </div>

      <Card>
        <CardContent className="space-y-8 p-6">
          <div className="space-y-2">
            <Label htmlFor="title">
              제목 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="콘텐츠 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>
              카테고리 <span className="text-destructive">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>배포 대상</Label>
            <TargetPicker
              divisions={divisions}
              teams={teams}
              users={users}
              value={target}
              onChange={setTarget}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>본문</Label>
            <RichEditor value={body} onChange={setBody} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>요약</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSummaryMode("manual");
                    setSummary("");
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    summaryMode === "manual"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  직접 작성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSummaryMode("ai");
                    setSummary("");
                  }}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                    summaryMode === "ai"
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  AI 자동 생성
                </button>
              </div>
            </div>

            {summaryMode === "ai" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateAiSummary}
                className="gap-1.5"
                disabled={isGeneratingSummary}
              >
                <Sparkles className="h-4 w-4" />
                {isGeneratingSummary ? "생성 중..." : "AI 요약 생성"}
              </Button>
            )}

            <Textarea
              placeholder={
                summaryMode === "ai"
                  ? "AI 요약 생성 버튼을 클릭하세요..."
                  : "요약 내용을 직접 입력하세요..."
              }
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              readOnly={summaryMode === "ai" && summary.length > 0}
              rows={4}
              className={cn(
                summaryMode === "ai" && summary.length > 0 && "bg-muted"
              )}
            />
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>파일 첨부</Label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 transition-colors",
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-input hover:border-primary/50"
              )}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF, DOCX, MP4, 이미지 · 파일당 최대 300MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.mp4,.png,.jpg,.jpeg,.gif,.webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>

            {files.length > 0 && (
              <ul className="space-y-2">
                {files.map((f) => {
                  const Icon = getFileIcon(f.file);
                  return (
                    <li
                      key={f.id}
                      className="flex items-center gap-3 rounded-md border border-input px-3 py-2"
                    >
                      <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {f.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getFileTypeLabel(f.file)} · {formatFileSize(f.file.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFile(f.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>외부 링크</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addLink}
                className="shrink-0 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                추가
              </Button>
            </div>

            {links.length > 0 && (
              <ul className="space-y-2">
                {links.map((link, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-3 rounded-md border border-input px-3 py-2"
                  >
                    <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {link}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLink(idx)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              size="lg"
              className="gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? mode === "edit"
                  ? "수정 중..."
                  : "등록 중..."
                : mode === "edit"
                  ? "콘텐츠 수정"
                  : "콘텐츠 등록"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
