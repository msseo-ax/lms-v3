import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { getAdminContentsData } from "@/lib/server/data/admin-contents";
import { AdminContentsClient } from "@/components/admin/admin-contents-client";

export default async function AdminContentsPage() {
  const contentList = await getAdminContentsData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">콘텐츠 관리</h1>
          <p className="text-muted-foreground mt-1">
            전체 콘텐츠를 관리하고 열람 현황을 확인하세요.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/contents/new">
            <Plus className="h-4 w-4 mr-2" />
            새 콘텐츠
          </Link>
        </Button>
      </div>

      <AdminContentsClient contentList={contentList} />
    </div>
  );
}
