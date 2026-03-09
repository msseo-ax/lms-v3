import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { AppSidebar } from "@/components/shell/sidebar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user;
  try {
    user = await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar
        user={{
          name: user.name,
          role: user.role,
          email: user.email,
          avatarUrl: user.avatarUrl,
        }}
      />
      <main className="flex-1 pt-14 pb-16 md:pt-0 md:pb-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <Badge variant="secondary" className="font-medium">
              관리자
            </Badge>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
