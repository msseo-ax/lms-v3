import Link from "next/link";
import {
  getMockCurrentUser,
  contents,
  readLogs,
  isContentTargetedForUser,
  isContentRead,
  categories,
  divisions,
  teams,
  getTargetLabels,
  contentFiles,
} from "@/lib/mock-db";
import { getCurrentUser } from "@/lib/auth";
import { getTargetLabels as getTargetLabelsFromData, isTargetedForUser } from "@/lib/targeting";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Eye, EyeOff, FileText } from "lucide-react";

interface MyPageData {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
    avatarUrl: string | null;
    divisionName?: string;
    teamName?: string;
  };
  targetedContents: Array<{ id: string }>;
  readContents: Array<{ id: string }>;
  unreadContents: Array<{
    id: string;
    title: string;
    categoryId: string;
    summary: string | null;
    createdAt: string;
    targetLabels: string[];
    fileCount: number;
  }>;
  categories: Array<{ id: string; name: string }>;
  userReadLogsCount: number;
}

async function getMyPageData(): Promise<MyPageData | null> {
  const isMockMode = process.env.USE_MOCK_DB === "true";

  if (isMockMode) {
    const currentUser = getMockCurrentUser();
    const division = divisions.find((d) => d.id === currentUser.divisionId);
    const team = teams.find((t) => t.id === currentUser.teamId);

    const targetedContents = contents.filter((content) =>
      isContentTargetedForUser(content.id, currentUser)
    );
    const readContents = targetedContents.filter((content) =>
      isContentRead(content.id, currentUser.id)
    );
    const unreadContents = targetedContents
      .filter((content) => !isContentRead(content.id, currentUser.id))
      .map((content) => ({
        id: content.id,
        title: content.title,
        categoryId: content.categoryId,
        summary: content.summary,
        createdAt: content.createdAt,
        targetLabels: getTargetLabels(content.id),
        fileCount: contentFiles.filter((file) => file.contentId === content.id).length,
      }));

    return {
      currentUser: {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role,
        avatarUrl: currentUser.avatarUrl,
        divisionName: division?.name,
        teamName: team?.name,
      },
      targetedContents: targetedContents.map((content) => ({ id: content.id })),
      readContents: readContents.map((content) => ({ id: content.id })),
      unreadContents,
      categories: categories.map((category) => ({ id: category.id, name: category.name })),
      userReadLogsCount: readLogs.filter((log) => log.userId === currentUser.id).length,
    };
  }

  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  const { prisma } = await import("@/lib/prisma");
  if (!prisma) return null;

  const [dbUser, dbContents, dbCategories, dbDivisions, dbTeams, dbUsers, dbReadLogs] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: currentUser.id },
        include: { division: true, team: true },
      }),
      prisma.content.findMany({
        include: {
          targets: true,
          files: true,
          readLogs: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.division.findMany({ select: { id: true, name: true } }),
      prisma.team.findMany({ select: { id: true, name: true } }),
      prisma.user.findMany({ select: { id: true, name: true } }),
      prisma.readLog.findMany({ where: { userId: currentUser.id }, select: { id: true } }),
    ]);

  if (!dbUser) return null;

  const targetedContents = dbContents.filter((content) =>
    isTargetedForUser(content.targets, {
      id: dbUser.id,
      name: dbUser.name,
      divisionId: dbUser.divisionId,
      teamId: dbUser.teamId,
    })
  );

  const readContents = targetedContents.filter((content) =>
    content.readLogs.some((log) => log.userId === currentUser.id)
  );

  const unreadContents = targetedContents
    .filter((content) => !content.readLogs.some((log) => log.userId === currentUser.id))
    .map((content) => ({
      id: content.id,
      title: content.title,
      categoryId: content.categoryId,
      summary: content.summary,
      createdAt: content.createdAt.toISOString(),
      targetLabels: getTargetLabelsFromData(content.targets, dbDivisions, dbTeams, dbUsers),
      fileCount: content.files.length,
    }));

  return {
    currentUser: {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      avatarUrl: dbUser.avatarUrl,
      divisionName: dbUser.division?.name,
      teamName: dbUser.team?.name,
    },
    targetedContents: targetedContents.map((content) => ({ id: content.id })),
    readContents: readContents.map((content) => ({ id: content.id })),
    unreadContents,
    categories: dbCategories,
    userReadLogsCount: dbReadLogs.length,
  };
}

export default async function MyPage() {
  const data = await getMyPageData();
  if (!data) return null;

  const { currentUser, targetedContents, readContents, unreadContents, userReadLogsCount } = data;

  const statCards = [
    {
      label: "대상 콘텐츠",
      value: targetedContents.length,
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      label: "열람 완료",
      value: readContents.length,
      icon: Eye,
      color: "text-emerald-600",
    },
    {
      label: "미열람",
      value: unreadContents.length,
      icon: EyeOff,
      color: "text-red-500",
    },
  ];

  const initials = currentUser.name.slice(0, 1);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 px-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={currentUser.avatarUrl ?? undefined} />
              <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{currentUser.name}</h1>
                <Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>
                  {currentUser.role === "admin" ? "관리자" : "일반"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{currentUser.email}</p>
              <p className="text-sm text-muted-foreground">
                {currentUser.divisionName} · {currentUser.teamName}
              </p>
              {userReadLogsCount > 0 && (
                <p className="text-xs text-muted-foreground mt-1">총 {userReadLogsCount}건 열람 완료</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="grid grid-cols-3 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <Icon className={cn("h-5 w-5 mx-auto", stat.color)} />
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">미열람 콘텐츠</h2>
        {unreadContents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
              <p>모든 콘텐츠를 열람했습니다!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {unreadContents.map((content) => {
              const category = data.categories.find((item) => item.id === content.categoryId);
              return (
                <Link key={content.id} href={`/contents/${content.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium text-sm">{content.title}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <Badge variant="secondary" className="text-xs">
                              {category?.name}
                            </Badge>
                            {content.targetLabels.map((label) => (
                              <Badge
                                key={label}
                                variant="outline"
                                className="text-[11px] px-1.5 py-0"
                              >
                                {label}
                              </Badge>
                            ))}
                            {content.fileCount > 0 && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                <FileText className="h-3 w-3" />
                                {content.fileCount}
                              </span>
                            )}
                          </div>
                          {content.summary && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                              {content.summary}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDate(content.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
