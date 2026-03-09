import {
  contents,
  users,
  readLogs,
  categories,
  getContentReadRate,
  getTargetLabels,
  contentTargets,
} from "@/lib/mock-db";
import { getReadRate, getTargetLabels as getTargetLabelsFromData, getTargetUserIds } from "@/lib/targeting";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ReadStatusCard } from "@/components/admin/read-status-card";
import {
  FileText,
  Users as UsersIcon,
  BarChart3,
  AlertCircle,
} from "lucide-react";

function getTargetUserIdsFromMock(contentId: string): string[] {
  const targets = contentTargets.filter((target) => target.contentId === contentId);
  return getTargetUserIds(targets, users);
}

export default async function AdminDashboardPage() {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const totalContents = contents.length;
    const totalUsers = users.length;
    const readRates = contents.map((content) => getContentReadRate(content.id));
    const avgReadRate = Math.round(
      readRates.reduce((acc, value) => acc + value, 0) / readRates.length
    );
    const unreadAlerts = readRates.filter((rate) => rate < 50).length;

    const stats = [
      {
        label: "총 콘텐츠",
        value: totalContents,
        icon: FileText,
        color: "text-blue-600",
        bg: "bg-blue-50",
      },
      {
        label: "전체 사용자",
        value: totalUsers,
        icon: UsersIcon,
        color: "text-violet-600",
        bg: "bg-violet-50",
      },
      {
        label: "평균 열람률",
        value: `${avgReadRate}%`,
        icon: BarChart3,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
      },
      {
        label: "미열람 경고",
        value: unreadAlerts,
        icon: AlertCircle,
        color: "text-red-600",
        bg: "bg-red-50",
      },
    ];

    const contentData = contents.map((content) => {
      const readRate = getContentReadRate(content.id);
      const targetLabels = getTargetLabels(content.id);
      const category = categories.find((categoryItem) => categoryItem.id === content.categoryId);
      const targetUserIds = getTargetUserIdsFromMock(content.id);
      const readUserIds = readLogs
        .filter((log) => log.contentId === content.id)
        .map((log) => log.userId);
      const unreadUserIds = targetUserIds.filter((id) => !readUserIds.includes(id));
      const unreadUsers = users.filter((user) => unreadUserIds.includes(user.id));

      return {
        id: content.id,
        title: content.title,
        readRate,
        targetLabels,
        categoryName: category?.name ?? "미분류",
        readCount: targetUserIds.length - unreadUserIds.length,
        totalCount: targetUserIds.length,
        unreadUsers,
      };
    });

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">읽기 현황 대시보드</h1>
          <p className="text-muted-foreground mt-1">콘텐츠별 열람 현황을 한눈에 확인하세요.</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold tracking-tight mt-1">{stat.value}</p>
                    </div>
                    <div className={cn("rounded-lg p-2.5", stat.bg)}>
                      <Icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">콘텐츠별 열람 현황</h2>
          <div className="grid grid-cols-2 gap-4">
            {contentData.map((data) => (
              <ReadStatusCard
                key={data.id}
                title={data.title}
                categoryName={data.categoryName}
                readRate={data.readRate}
                readCount={data.readCount}
                totalCount={data.totalCount}
                targetLabels={data.targetLabels}
                unreadUsers={data.unreadUsers}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const [dbContents, dbUsers, dbDivisions, dbTeams] = await Promise.all([
    prisma.content.findMany({
      include: {
        category: true,
        targets: true,
        readLogs: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, divisionId: true, teamId: true, avatarUrl: true },
    }),
    prisma.division.findMany({ select: { id: true, name: true } }),
    prisma.team.findMany({ select: { id: true, name: true } }),
  ]);

  const readRates = dbContents.map((content) => getReadRate(content.targets, content.readLogs, dbUsers));
  const avgReadRate = readRates.length
    ? Math.round(readRates.reduce((acc, value) => acc + value, 0) / readRates.length)
    : 0;
  const unreadAlerts = readRates.filter((rate) => rate < 50).length;

  const stats = [
    {
      label: "총 콘텐츠",
      value: dbContents.length,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "전체 사용자",
      value: dbUsers.length,
      icon: UsersIcon,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "평균 열람률",
      value: `${avgReadRate}%`,
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "미열람 경고",
      value: unreadAlerts,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const contentData = dbContents.map((content) => {
    const targetUserIds = getTargetUserIds(content.targets, dbUsers);
    const readUserIds = new Set(content.readLogs.map((log) => log.userId));
    const unreadUserIds = targetUserIds.filter((id) => !readUserIds.has(id));
    const unreadUsers = dbUsers.filter((user) => unreadUserIds.includes(user.id));
    const readRate = getReadRate(content.targets, content.readLogs, dbUsers);

    return {
      id: content.id,
      title: content.title,
      readRate,
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, dbTeams, dbUsers),
      categoryName: content.category?.name ?? "미분류",
      readCount: targetUserIds.length - unreadUserIds.length,
      totalCount: targetUserIds.length,
      unreadUsers,
    };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">읽기 현황 대시보드</h1>
        <p className="text-muted-foreground mt-1">콘텐츠별 열람 현황을 한눈에 확인하세요.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold tracking-tight mt-1">{stat.value}</p>
                  </div>
                  <div className={cn("rounded-lg p-2.5", stat.bg)}>
                    <Icon className={cn("h-5 w-5", stat.color)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">콘텐츠별 열람 현황</h2>
        <div className="grid grid-cols-2 gap-4">
          {contentData.map((data) => (
            <ReadStatusCard
              key={data.id}
              title={data.title}
              categoryName={data.categoryName}
              readRate={data.readRate}
              readCount={data.readCount}
              totalCount={data.totalCount}
              targetLabels={data.targetLabels}
              unreadUsers={data.unreadUsers}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
