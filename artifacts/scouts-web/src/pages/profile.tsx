import { useGetMyProfile, useGetMyAttendanceSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCircle, Mail, CalendarCheck } from "lucide-react";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: summary, isLoading: summaryLoading } = useGetMyAttendanceSummary();

  const getInitials = (first: string | null, last: string | null) => {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
  };

  return (
    <div className="space-y-6 max-w-xl" data-testid="profile-page">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-primary" />
          Profile / الملف الشخصي
        </h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          {profileLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Avatar className="h-16 w-16">
                {profile?.profileImageUrl && (
                  <AvatarImage src={profile.profileImageUrl} alt={profile.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                  {getInitials(profile?.firstName ?? null, profile?.lastName ?? null)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-foreground" data-testid="text-profile-name">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    className="capitalize"
                    variant={profile?.role === "leader" || profile?.role === "developer" ? "default" : "secondary"}
                    data-testid="text-profile-role"
                  >
                    {profile?.role === "leader" ? "Leader / قائد" : profile?.role === "developer" ? "Developer / مطور" : "Scout / كشاف"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      {!profileLoading && profile?.email && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact / التواصل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span data-testid="text-profile-email">{profile.email}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            Attendance / الحضور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Attendance Rate</span>
                <span className="font-semibold text-primary" data-testid="text-attendance-rate">{summary?.rate ?? 0}%</span>
              </div>
              <Progress value={summary?.rate ?? 0} className="h-2" />
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="bg-muted/50 rounded-lg p-3" data-testid="stat-total-sessions">
                  <p className="text-2xl font-bold">{summary?.totalSessions ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total / الكل</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3" data-testid="stat-attended">
                  <p className="text-2xl font-bold text-green-600">{summary?.attended ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Present / حضور</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3" data-testid="stat-absent">
                  <p className="text-2xl font-bold text-red-500">{summary?.absent ?? 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Absent / غياب</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
