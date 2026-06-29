import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Bell, BellRing, Check, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Notification = {
  id: string;
  type: "announcement" | "post";
  title: string;
  message: string;
  relatedId: string;
  authorName: string | null;
  isRead: boolean;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

export function NotificationBell() {
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
          notifications: prev.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n,
          ),
        };
      });
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          unreadCount: 0,
          notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        };
      });
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    setOpen(false);
    if (n.type === "announcement") {
      navigate("/announcements");
    } else {
      navigate("/posts");
    }
  };

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-3 h-auto py-2.5 md:py-3 px-3 rounded-md hover:bg-sidebar-accent/50 text-sidebar-foreground"
        onClick={() => setOpen(!open)}
      >
        <div className="relative shrink-0">
          {unreadCount > 0 ? (
            <>
              <BellRing className="h-5 w-5 text-primary" />
              <span className="absolute -top-1.5 -right-1.5 flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          ) : (
            <Bell className="h-5 w-5 opacity-80" />
          )}
        </div>
        <span className="text-sm font-medium">Notifications / إشعارات</span>
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 mx-3 md:mx-4 bg-popover text-popover-foreground rounded-lg border border-border shadow-xl z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && !data ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : data && data.notifications.length > 0 ? (
              data.notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 flex items-start gap-3 ${
                    !n.isRead ? "bg-muted/30" : ""
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {!n.isRead && (
                      <span className="block h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">
                      {n.authorName ? `by ${n.authorName}` : ""}
                      {n.createdAt && (
                        <span className="ml-2">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
