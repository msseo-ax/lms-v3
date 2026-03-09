"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContentRowActionsProps {
  id: string;
}

export function ContentRowActions({ id }: ContentRowActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm("정말 이 콘텐츠를 삭제하시겠습니까?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/contents/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        alert(data.error ?? "콘텐츠 삭제에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      alert("콘텐츠 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/admin/contents/${id}/edit`}>
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
