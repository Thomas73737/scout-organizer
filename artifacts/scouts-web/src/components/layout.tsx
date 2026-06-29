import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile, useListUsers } from "@workspace/api-client-react";
import type { ScoutUser } from "@workspace/api-client-react";
import { Home, CalendarCheck, MessageSquare, UserCircle, Shield, LogOut, Menu, X, Users, Trash2, Megaphone, Bell, BellRing, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const getInitials = (first: string | null, last: string | null) => {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
};

const roleBadge = (role: string) => {
  switch (role) {
    case "leader":
      return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">Leader</Badge>;
    case "developer":
      return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">Dev</Badge>;
    default:
      return <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Scout</Badge>;
  }
};

const pageTitles: Record<string, string> = {
  "/": "Home / الرئيسية",
  "/announcements": "Announcements / إعلانات",
  "/attendance": "Attendance / الحضور",
  "/posts": "Community / المجتمع",
  "/profile": "Profile / الملف الشخصي",
  "/admin": "Admin / الإدارة",
};

const tabItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Announce", href: "/announcements", icon: Megaphone },
  { label: "Attendance", href: "/attendance", icon: CalendarCheck },
  { label: "Community", href: "/posts", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: UserCircle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: profile } = useGetMyProfile();
  const { data: allUsers } = useListUsers();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isMembersPanelOpen, setIsMembersPanelOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<ScoutUser | null>(null);
  const [isRemovingImage, setIsRemovingImage] = React.useState(false);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [showUserMenu, setShowUserMenu] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);

  const isLeader = profile?.role === "leader" || profile?.role === "developer";

  React.useEffect(() => {
    const fetchNotifCount = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount ?? 0);
        }
      } catch {}
    };
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 15000);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);

  const handleRemovePhoto = async () => {
    if (!profile?.profileImageUrl) return;
    setIsRemovingImage(true);
    try {
      const res = await fetch("/api/users/me/profile-image", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to remove profile photo");
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Profile photo removed successfully" });
    } catch {
      toast({ title: "Failed to remove profile photo", variant: "destructive" });
    } finally {
      setIsRemovingImage(false);
    }
  };

  const navItems = [
    { label: "Home / الرئيسية", href: "/", icon: Home },
    { label: "Announcements / إعلانات", href: "/announcements", icon: Megaphone },
    { label: "Attendance / الحضور", href: "/attendance", icon: CalendarCheck },
    { label: "Community / المجتمع", href: "/posts", icon: MessageSquare },
    { label: "Profile / الملف الشخصي", href: "/profile", icon: UserCircle },
  ];

  if (isLeader) {
    navItems.push({ label: "Admin / الإدارة", href: "/admin", icon: Shield });
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const sortedUsers = React.useMemo(() => {
    if (!allUsers) return [];
    const roleOrder: Record<string, number> = { developer: 0, leader: 1, scout: 2 };
    return [...allUsers].sort((a, b) => (roleOrder[a.role] ?? 9) - (roleOrder[b.role] ?? 9));
  }, [allUsers]);

  const currentTabLabel = pageTitles[location] ?? "";

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground flex-col md:h-screen md:flex-row md:overflow-hidden">
      {/* ───── Mobile Header ───── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Menu className="h-5 w-5 shrink-0 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" onClick={toggleMobileMenu} />
          <h1 className="font-serif font-bold text-base truncate">{currentTabLabel || "San George Scouts"}</h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary/80 h-8 w-8 relative"
            onClick={() => window.location.href = "/announcements"}
          >
            {unreadCount > 0 ? (
              <>
                <BellRing className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              </>
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* ───── Desktop Sidebar ───── */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-green-900 dark:bg-gray-950 text-white shrink-0 min-h-screen overflow-y-auto">
        {/* Brand */}
        <div className="px-6 pt-8 pb-6 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="font-serif font-bold text-lg text-white">S</span>
            </div>
            <h1 className="font-serif font-bold text-xl text-white">San George Scouts</h1>
          </div>
          <p className="text-xs font-sans text-white/50 ml-11" dir="rtl">كشافة مار جرجس</p>
        </div>

        {/* Navigation */}
        <nav className="px-3 space-y-0.5 shrink-0">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
                  isActive
                    ? "bg-white/10 text-white font-medium shadow-sm"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}>
                  <div className={`w-1 h-5 rounded-full shrink-0 transition-colors ${
                    isActive ? "bg-green-400" : "bg-transparent group-hover:bg-white/20"
                  }`} />
                  <item.icon className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    isActive ? "text-green-400" : "text-white/40 group-hover:text-white/60"
                  }`} />
                  <span className="text-sm">{item.label}</span>
                </div>
              </Link>
            );
          })}
          {/* Notifications */}
          <Link href="/announcements">
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer group ${
              location === "/notifications"
                ? "bg-white/10 text-white font-medium shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}>
              <div className={`w-1 h-5 rounded-full shrink-0 transition-colors ${
                location === "/notifications" ? "bg-green-400" : "bg-transparent group-hover:bg-white/20"
              }`} />
              <div className="relative shrink-0">
                {unreadCount > 0 ? (
                  <BellRing className="h-4.5 w-4.5 text-green-400" />
                ) : (
                  <Bell className="h-4.5 w-4.5 text-white/40 group-hover:text-white/60" />
                )}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex min-w-[15px] h-[15px] items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-sm">Notifications / إشعارات</span>
            </div>
          </Link>
        </nav>

        {/* User footer */}
        <div className="p-3 mx-3 mb-3 mt-2 rounded-lg bg-white/5 border border-white/10 shrink-0">
          {profile && (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white/10">
                {profile.profileImageUrl && (
                  <AvatarImage src={profile.profileImageUrl} alt={profile.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-green-700 text-white text-xs">
                  {getInitials(profile.firstName ?? null, profile.lastName ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate leading-tight">{profile.firstName} {profile.lastName}</p>
                <p className="text-xs text-white/40 truncate">{profile.email ?? profile.phone}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/40 hover:text-white hover:bg-white/10 shrink-0"
                onClick={() => logout()}
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* ───── Mobile Sidebar Overlay ───── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleMobileMenu} />
      )}

      {/* ───── Mobile Sidebar Drawer ───── */}
      <div className={`md:hidden flex flex-col w-72 bg-green-900 dark:bg-gray-950 text-white border-r border-green-800 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out fixed inset-y-0 left-0 z-[60] overflow-y-auto ${
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="p-4 border-b border-green-800 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-white">San George Scouts</h2>
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="text-white/80 hover:bg-green-800 hover:text-white h-8 w-8">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs font-sans text-white/60 mt-0.5" dir="rtl">كشافة مار جرجس</p>
          {profile && (
            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-green-800 dark:border-gray-800">
              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-white/20">
                {profile.profileImageUrl && (
                  <AvatarImage src={profile.profileImageUrl} alt={profile.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-green-700 text-white text-sm">
                  {getInitials(profile.firstName ?? null, profile.lastName ?? null)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile.firstName} {profile.lastName}</p>
                <p className="text-xs text-white/50 truncate">{profile.email}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="px-3 py-4 space-y-1 shrink-0">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                location === item.href
                  ? "bg-green-700 text-white font-medium"
                  : "text-white/80 hover:bg-green-800/50 hover:text-white"
              }`}>
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
          <Link href="/announcements" onClick={() => setIsMobileMenuOpen(false)}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
              location === "/notifications"
                ? "bg-green-700 text-white font-medium"
                : "text-white/80 hover:bg-green-800/50 hover:text-white"
            }`}>
              <div className="relative">
                {unreadCount > 0 ? <BellRing className="h-5 w-5 shrink-0" /> : <Bell className="h-5 w-5 shrink-0" />}
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex min-w-[16px] h-[16px] items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none px-1">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium">Notifications / إشعارات</span>
            </div>
          </Link>
        </nav>

        <div className="p-3 border-t border-green-800 dark:border-gray-800 space-y-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-red-300 hover:text-red-200 hover:bg-red-900/30 gap-3 h-auto py-1.5 text-xs disabled:opacity-30"
            onClick={handleRemovePhoto}
            disabled={isRemovingImage || !profile?.profileImageUrl}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>{isRemovingImage ? "Removing..." : "Remove profile photo"}</span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-green-800/50 gap-3 h-auto py-2"
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="text-sm">تسجيل الخروج / Log out</span>
          </Button>
        </div>
      </div>

      {/* ───── Desktop Top Bar ───── */}
      <div className="hidden md:flex flex-col flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-8 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-bold text-foreground">{currentTabLabel || "San George Scouts"}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <Link href="/announcements">
              <Button variant="ghost" size="icon" className="relative h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/50">
                {unreadCount > 0 ? (
                  <>
                    <BellRing className="h-5 w-5 text-primary" />
                    <span className="absolute -top-0.5 -right-0.5 flex min-w-[17px] h-[17px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold leading-none px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  </>
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </Button>
            </Link>

            {/* User avatar + dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Avatar className="h-7 w-7">
                  {profile?.profileImageUrl && (
                    <AvatarImage src={profile.profileImageUrl} alt={profile?.firstName ?? ""} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    {getInitials(profile?.firstName ?? null, profile?.lastName ?? null)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-foreground max-w-[120px] truncate">{profile?.firstName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-popover text-popover-foreground rounded-lg border border-popover-border shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-medium text-foreground truncate">{profile?.firstName} {profile?.lastName}</p>
                    <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                  </div>
                  <Link href="/profile">
                    <button
                      onClick={() => setShowUserMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <UserCircle className="h-4 w-4 text-muted-foreground" />
                      Profile / الملف الشخصي
                    </button>
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); handleRemovePhoto(); }}
                    disabled={isRemovingImage || !profile?.profileImageUrl}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>{isRemovingImage ? "Removing..." : "Remove profile photo"}</span>
                  </button>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => { setShowUserMenu(false); logout(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-muted-foreground" />
                      Log out / تسجيل الخروج
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex min-w-0">
          <main className="flex-1 p-6 lg:p-10 max-w-6xl mx-auto w-full overflow-y-auto">
            {children}
          </main>

          {/* Desktop Members Panel */}
          {isMembersPanelOpen && (
            <aside className="hidden lg:flex flex-col w-72 shrink-0 border-l border-border bg-background sticky top-0 h-[calc(100dvh-57px)]">
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Members / الأعضاء
                  <span className="text-xs text-muted-foreground font-normal ml-auto">{allUsers?.length ?? 0}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setIsMembersPanelOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {sortedUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8 shrink-0">
                      {user.profileImageUrl && (
                        <AvatarImage src={user.profileImageUrl} alt={user.firstName ?? ""} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate leading-tight">
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                    {roleBadge(user.role)}
                  </button>
                ))}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* ───── Mobile Bottom Tab Bar ───── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] safe-area-bottom">
        <div className="flex items-center justify-around h-14">
          {tabItems.map((tab) => {
            const isActive = location === tab.href;
            return (
              <Link key={tab.href} href={tab.href}>
                <div className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-0 transition-colors ${
                  isActive ? "text-green-800 dark:text-green-400" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}>
                  <tab.icon className="h-5 w-5" />
                  <span className={`text-[10px] leading-tight ${isActive ? "font-bold" : "font-medium"}`}>{tab.label}</span>
                  {isActive && <span className="h-0.5 w-4 rounded-full bg-green-800 dark:bg-green-400 mt-0.5" />}
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Members Toggle */}
      {!isMembersPanelOpen && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-11 w-11 rounded-full shadow-lg z-40 hidden lg:flex hover:shadow-xl transition-shadow"
          onClick={() => setIsMembersPanelOpen(true)}
        >
          <Users className="h-5 w-5" />
        </Button>
      )}

      {/* Mobile Members Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-20 right-4 h-11 w-11 rounded-full shadow-lg z-40 lg:hidden"
          >
            <Users className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" />
              Members / الأعضاء
              <span className="text-xs text-muted-foreground font-normal ml-auto">{allUsers?.length ?? 0}</span>
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto py-2 h-full">
            {sortedUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => { setSelectedUser(user); }}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {user.profileImageUrl && (
                    <AvatarImage src={user.profileImageUrl} alt={user.firstName ?? ""} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
                {roleBadge(user.role)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* User Detail Dialog */}
      <Dialog open={selectedUser !== null} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Member Profile / الملف الشخصي</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="flex flex-col items-center gap-4 py-4">
              <Avatar className="h-20 w-20">
                {selectedUser.profileImageUrl && (
                  <AvatarImage src={selectedUser.profileImageUrl} alt={selectedUser.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                  {getInitials(selectedUser.firstName, selectedUser.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <div className="mt-2">{roleBadge(selectedUser.role)}</div>
                {selectedUser.email && (
                  <p className="text-sm text-muted-foreground mt-2">{selectedUser.email}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
