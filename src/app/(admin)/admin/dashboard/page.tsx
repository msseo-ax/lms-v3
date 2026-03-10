import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ReadStatusCard } from "@/components/admin/read-status-card";
import {
  FileText,
  Users as UsersIcon,
  BarChart3,
  AlertCircle,
} from "lucide-react";
import { getAdminDashboardData } from "@/lib/server/data/admin-dashboard";

export default async function AdminDashboardPage() {
  const data = await getAdminDashboardData();
  if (!data) return null;

  const stats = [
    {
      label: "총 콘텐츠",
      value: data.stats.totalContents,
      icon: FileText,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "전체 사용자",
      value: data.stats.totalUsers,
      icon: UsersIcon,
      color: "text-violet-600",
      bg: "bg-violet-50",
    },
    {
      label: "평균 열람률",
      value: `${data.stats.avgReadRate}%`,
      icon: BarChart3,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "미열람 경고",
      value: data.stats.unreadAlerts,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

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
            {data.contentData.map((contentRow) => (
              <ReadStatusCard
                key={contentRow.id}
                contentId={contentRow.id}
                title={contentRow.title}
                categoryName={contentRow.categoryName}
                readRate={contentRow.readRate}
                readCount={contentRow.readCount}
                totalCount={contentRow.totalCount}
                targetLabels={contentRow.targetLabels}
                unreadUsers={contentRow.unreadUsers}
              />
            ))}
          </div>
      </div>
    </div>
  );
}
