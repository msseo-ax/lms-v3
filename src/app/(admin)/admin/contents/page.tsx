import Link from "next/link";
import {
  contents,
  categories as mockCategories,
  getTargetLabels,
  getContentReadRate,
} from "@/lib/mock-db";
import { formatDate } from "@/lib/utils";
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

function resolveTargetLabels(
  targets: Array<{ targetType: "all" | "division" | "team" | "user"; targetId: string | null }>,
  divisions: Array<{ id: string; name: string }>,
  teams: Array<{ id: string; name: string }>,
  users: Array<{ id: string; name: string }>
) {
  return targets.map((target) => {
    if (target.targetType === "all") return "전체";
    if (target.targetType === "division") {
      return divisions.find((item) => item.id === target.targetId)?.name ?? "본부";
    }
    if (target.targetType === "team") {
      return teams.find((item) => item.id === target.targetId)?.name ?? "팀";
    }
    return users.find((item) => item.id === target.targetId)?.name ?? "개인";
  });
}

function resolveReadRate(
  targets: Array<{ targetType: "all" | "division" | "team" | "user"; targetId: string | null }>,
  readLogs: Array<{ userId: string }>,
  users: Array<{ id: string; divisionId: string | null; teamId: string | null }>
) {
  let targetUserIds: string[] = [];

  if (targets.some((target) => target.targetType === "all")) {
    targetUserIds = users.map((user) => user.id);
  } else {
    const targetSet = new Set<string>();

    for (const target of targets) {
      if (target.targetType === "division") {
        users
          .filter((user) => user.divisionId === target.targetId)
          .forEach((user) => targetSet.add(user.id));
      }

      if (target.targetType === "team") {
        users
          .filter((user) => user.teamId === target.targetId)
          .forEach((user) => targetSet.add(user.id));
      }

      if (target.targetType === "user" && target.targetId) {
        targetSet.add(target.targetId);
      }
    }

    targetUserIds = Array.from(targetSet);
  }

  if (targetUserIds.length === 0) return 0;

  const readUsers = new Set(readLogs.map((item) => item.userId));
  const readCount = targetUserIds.filter((id) => readUsers.has(id)).length;
  return Math.round((readCount / targetUserIds.length) * 100);
}

export default async function AdminContentsPage() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  const contentList = isMockMode
    ? contents.map((content) => ({
        id: content.id,
        title: content.title,
        categoryName:
          mockCategories.find((category) => category.id === content.categoryId)?.name ??
          "미분류",
        targetLabels: getTargetLabels(content.id),
        readRate: getContentReadRate(content.id),
        createdAt: formatDate(content.createdAt),
      }))
    : await (async () => {
        const { prisma } = await import("@/lib/prisma");
        if (!prisma) return [];

        const [dbContents, dbDivisions, dbTeams, dbUsers] = await Promise.all([
          prisma.content.findMany({
            include: {
              category: true,
              targets: true,
              readLogs: true,
            },
            orderBy: { createdAt: "desc" },
          }),
          prisma.division.findMany({ select: { id: true, name: true } }),
          prisma.team.findMany({ select: { id: true, name: true } }),
          prisma.user.findMany({
            select: { id: true, name: true, divisionId: true, teamId: true },
          }),
        ]);

        return dbContents.map((content) => ({
          id: content.id,
          title: content.title,
          categoryName: content.category?.name ?? "미분류",
          targetLabels: resolveTargetLabels(
            content.targets,
            dbDivisions,
            dbTeams,
            dbUsers
          ),
          readRate: resolveReadRate(content.targets, content.readLogs, dbUsers),
          createdAt: formatDate(content.createdAt.toISOString()),
        }));
      })();

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
              <TableHead>제목</TableHead>
              <TableHead className="w-28">카테고리</TableHead>
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
