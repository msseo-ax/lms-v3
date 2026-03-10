import Link from "next/link";
import {
  BookOpen,
  Eye,
  EyeOff,
  FileText,
} from "lucide-react";
import { getMyPageData } from "@/lib/server/data/mypage";
import { formatDate, cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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
              <p className="text-sm text-muted-foreground">{currentUser.divisionName}</p>
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
