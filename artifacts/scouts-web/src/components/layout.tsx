import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Home, Bell, CalendarCheck, MessageSquare, UserCircle, Shield, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: profile } = useGetMyProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const isLeader = profile?.role === "leader";

  const navItems = [
    { label: "Home / الرئيسية", href: "/", icon: Home },
    { label: "Announcements / إعلانات", href: "/announcements", icon: Bell },
    { label: "Attendance / الحضور", href: "/attendance", icon: CalendarCheck },
    { label: "Community / المجتمع", href: "/posts", icon: MessageSquare },
    { label: "Profile / الملف الشخصي", href: "/profile", icon: UserCircle },
  ];

  if (isLeader) {
    navItems.push({ label: "Admin / الإدارة", href: "/admin", icon: Shield });
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-primary text-primary-foreground shadow-md sticky top-0 z-50">
        <div className="font-serif font-bold text-lg">San George Scouts</div>
        <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="text-primary-foreground hover:bg-primary/80">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>

      {/* Sidebar */}
      <div className={`md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border shadow-lg transition-transform duration-300 ease-in-out fixed md:static inset-y-0 left-0 z-40 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 pb-2">
          <h1 className="font-serif font-bold text-2xl mb-1 text-primary-foreground">San George Scouts</h1>
          <p className="text-sm font-sans text-sidebar-foreground/80 opacity-80" dir="rtl">كشافة مار جرجس</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
              <div className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors cursor-pointer ${
                location === item.href 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                  : "hover:bg-sidebar-accent/50 text-sidebar-foreground"
              }`}>
                <item.icon className="h-5 w-5 opacity-80" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border">
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground gap-3" 
            onClick={() => logout()}
          >
            <LogOut className="h-5 w-5" />
            <span>تسجيل الخروج / Log out</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 max-h-screen overflow-y-auto bg-background">
        {/* Overlay for mobile */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={toggleMobileMenu} />
        )}
        <main className="flex-1 p-6 md:p-10 w-full max-w-5xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
