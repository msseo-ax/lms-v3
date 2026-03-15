import {
  BookOpen,
  BookOpenCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import { getMyPageData } from "@/lib/server/data/mypage";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { MyPageContents } from "@/components/mypage/mypage-contents";

export default async function MyPage() {
  const data = await getMyPageData();
  if (!data) return null;

  const { currentUser, targetedContents, completedContents, readingContents, incompleteContents, userReadLogsCount } = data;

  const statCards = [
    {
      label: "대상 콘텐츠",
      value: targetedContents.length,
      icon: BookOpen,
      color: "text-blue-600",
    },
    {
      label: "열람 완료",
      value: completedContents.length,
      icon: BookOpenCheck,
      color: "text-emerald-600",
    },
    {
      label: "열람중",
      value: readingContents.length,
      icon: Eye,
      color: "text-orange-600",
    },
    {
      label: "미열람",
      value: incompleteContents.filter((c) => c.readStatus === "unread").length,
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

      <div className="grid grid-cols-4 gap-3">
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

      <MyPageContents
        contents={incompleteContents}
        categories={data.categories}
      />
    </div>
  );
}
