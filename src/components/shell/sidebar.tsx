"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  GraduationCap,
  Home,
  User,
  LayoutDashboard,
  FolderTree,
  FileText,
  Menu,
  PanelLeftClose,
  PanelLeft,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SidebarUser {
  name: string;
  role: "admin" | "user";
  email: string;
  avatarUrl: string | null;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const mainNavItems: NavItem[] = [
  { label: "홈", href: "/", icon: Home },
  { label: "마이페이지", href: "/mypage", icon: User },
];

const adminNavItems: NavItem[] = [
  { label: "콘텐츠 관리", href: "/admin/contents", icon: FileText },
  { label: "대시보드", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "카테고리 관리", href: "/admin/categories", icon: FolderTree },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        collapsed && "justify-center px-2"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function MobileNavLink({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
        isActive ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{item.label}</span>
    </Link>
  );
}

function SidebarContent({
  user,
  collapsed,
  onToggleCollapse,
}: {
  user: SidebarUser;
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">
              HOMES LMS
            </span>
          )}
        </Link>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={onToggleCollapse}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            collapsed={collapsed}
          />
        ))}

        {user.role === "admin" && (
          <>
            <Separator className="my-4" />
            {!collapsed && (
              <div className="flex items-center gap-2 px-3 pb-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  관리자
                </span>
              </div>
            )}
            {adminNavItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </>
        )}
      </nav>

      <div className="border-t p-3">
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-2",
            collapsed && "justify-center px-0"
          )}
        >
          <Avatar className="h-8 w-8">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {user.name.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {user.role === "admin" ? "관리자" : "사용자"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ user }: { user: SidebarUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const mobileItems = [
    ...mainNavItems,
    ...(user.role === "admin" ? adminNavItems.slice(0, 1) : []),
  ];

  return (
    <>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r bg-card transition-all duration-200 md:flex md:flex-col",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <SidebarContent
          user={user}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </aside>

      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center border-b bg-card px-4 md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">메뉴</SheetTitle>
            <SidebarContent user={user} collapsed={false} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 pl-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">HOMES LMS</span>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card md:hidden">
        <div className="flex items-center justify-around px-2 safe-bottom">
          {mobileItems.map((item) => (
            <MobileNavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
            />
          ))}
        </div>
      </nav>

      <div
        className={cn(
          "hidden md:block shrink-0 transition-all duration-200",
          collapsed ? "w-16" : "w-64"
        )}
      />
    </>
  );
}
