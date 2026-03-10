import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContentRow } from "@/components/admin/content-row";
import { Plus } from "lucide-react";
import { getAdminContentsData } from "@/lib/server/data/admin-contents";

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

      <Card>
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[42%]">제목</TableHead>
                <TableHead className="w-40">카테고리</TableHead>
                <TableHead className="w-36">대상</TableHead>
                <TableHead className="w-24">생성일</TableHead>
                <TableHead className="w-20">열람률</TableHead>
              <TableHead className="w-24">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contentList.map((c) => (
              <ContentRow
                key={c.id}
                id={c.id}
                title={c.title}
                categoryName={c.categoryName}
                targetLabels={c.targetLabels}
                createdAt={c.createdAt}
                readRate={c.readRate}
              />
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
