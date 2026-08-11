import { useListAnnouncements, useListPosts, useGetUserStats } from "@workspace/api-client-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Bell, MessageSquare, CalendarCheck, Send, CalendarDays, Trophy } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: announcements, isLoading: annLoading } = useListAnnouncements();
  const { data: posts, isLoading: postsLoading } = useListPosts();
  const { data: stats, isLoading: statsLoading } = useGetUserStats();

  const latestAnnouncements = announcements?.slice(0, 3) ?? [];
  const latestPosts = posts?.slice(0, 3) ?? [];

  return (
    <div className="space-y-8" data-testid="home-page">
      {/* Welcome Banner */}
      <div className="bg-primary text-primary-foreground rounded-xl p-6 sm:p-8 shadow-md">
        {profileLoading ? (
          <Skeleton className="h-8 w-64 bg-primary-foreground/20" />
        ) : (
          <>
            <p className="text-primary-foreground/70 text-sm mb-1">
              {profile?.role === "leader" ? "Leader" : profile?.role === "developer" ? "Developer" : profile?.role === "cp_of_cps" ? "CP of CPs" : profile?.role === "cp" ? "CP" : "Scout"}
            </p>
            <h2 className="text-2xl font-serif font-bold mb-1">
              أهلاً، {profile?.firstName ?? "أهلاً"} 
            </h2>
            <p className="text-primary-foreground/80 text-sm mt-2" dir="rtl">
              مرحباً بك في بوابة كشافة مار جرجس هليوبوليس
            </p>
          </>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="col-span-2 md:col-span-1" data-testid="stat-members">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{(stats?.totalScouts ?? 0) + (stats?.totalCp ?? 0) + (stats?.totalCpOfCps ?? 0) + (stats?.totalLeaders ?? 0) + (stats?.totalDevelopers ?? 0)}</p>
                )}
                <p className="text-xs text-muted-foreground">Members / أعضاء</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1" data-testid="stat-scouts">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stats?.totalScouts ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Scouts / كشافة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1" data-testid="stat-cp">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Users className="h-5 w-5 text-teal-500" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stats?.totalCp ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">CP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1" data-testid="stat-cp-of-cps">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Users className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stats?.totalCpOfCps ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">CP of CPs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1" data-testid="stat-leaders">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stats?.totalLeaders ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Leaders / قادة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 md:col-span-1" data-testid="stat-developers">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                {statsLoading ? (
                  <Skeleton className="h-6 w-12" />
                ) : (
                  <p className="text-2xl font-bold text-foreground">{stats?.totalDevelopers ?? 0}</p>
                )}
                <p className="text-xs text-muted-foreground">Developers / مطورين</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/chat">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Send className="h-6 w-6 text-primary mb-2" />
              <p className="text-sm font-medium">Chat / الدردشة</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/calendar">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <CalendarDays className="h-6 w-6 text-primary mb-2" />
              <p className="text-sm font-medium">Calendar / التقويم</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/leaderboard">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Trophy className="h-6 w-6 text-yellow-500 mb-2" />
              <p className="text-sm font-medium">Leaderboard / المتصدرين</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Latest Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Bell className="h-5 w-5 text-primary" />
            Latest Announcements / آخر الإعلانات
          </CardTitle>
          <Link href="/announcements" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {annLoading ? (
            [1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : latestAnnouncements.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No announcements yet</p>
          ) : (
            latestAnnouncements.map((ann) => (
              <div key={ann.id} className="border-l-2 border-primary pl-4 py-1" data-testid={`announcement-item-${ann.id}`}>
                <p className="font-medium text-sm text-foreground">{ann.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{ann.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(ann.createdAt).toLocaleDateString("ar-EG")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Latest Posts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <MessageSquare className="h-5 w-5 text-secondary" />
            Community Posts / منشورات المجتمع
          </CardTitle>
          <Link href="/posts" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="space-y-3">
          {postsLoading ? (
            [1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)
          ) : latestPosts.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No posts yet</p>
          ) : (
            latestPosts.map((post) => (
              <div key={post.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0" data-testid={`post-item-${post.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">{post.authorName}</span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.authorRole}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
