import { useState } from "react";
import { useGetMyProfile, useGetMyAttendanceSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@workspace/replit-auth-web";
import { usePushNotificationContext } from "@/hooks/PushNotificationContext";
import { UserCircle, Mail, CalendarCheck, Camera, Lock, X, Bell, BellOff } from "lucide-react";

export default function Profile() {
  const { data: profile, isLoading: profileLoading } = useGetMyProfile();
  const { data: summary, isLoading: summaryLoading } = useGetMyAttendanceSummary();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { permission, isSubscribed, deviceCount, appStatus, subscribe, unsubscribe } = usePushNotificationContext();

  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [isRemovingImage, setIsRemovingImage] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const getInitials = (first: string | null, last: string | null) => {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Please select an image file (JPG, PNG, etc.)", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Photo size must be less than 5MB", variant: "destructive" });
        return;
      }
      setSelectedPhoto(file);
    }
  };

  const handleSavePhoto = async () => {
    if (!selectedPhoto) return;
    setIsSavingImage(true);
    try {
      const res = await fetch("/api/users/me/profile-image/upload", {
        method: "POST",
        body: selectedPhoto,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = "Failed to upload profile photo";
        try {
          const json = JSON.parse(text);
          msg = json.error || msg;
        } catch {}
        console.error("Profile image upload failed:", res.status, text);
        throw new Error(msg);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      setSelectedPhoto(null);
      toast({ title: "Profile photo updated successfully" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to update profile photo", variant: "destructive" });
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsRemovingImage(true);
    try {
      const res = await fetch("/api/users/me/profile-image", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let msg = "Failed to remove profile photo";
        try {
          const json = JSON.parse(text);
          msg = json.error || msg;
        } catch {}
        throw new Error(msg);
      }

      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({ title: "Profile photo removed successfully" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to remove profile photo", variant: "destructive" });
    } finally {
      setIsRemovingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({ title: "Please fill in all password fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 4) {
      toast({ title: "New password must be at least 4 characters", variant: "destructive" });
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: "include",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed successfully" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to change password", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
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
                <div className="relative">
                <Avatar className="h-16 w-16">
                  {(profile?.profileImageUrl || selectedPhoto) && (
                    <AvatarImage src={selectedPhoto ? URL.createObjectURL(selectedPhoto) : profile?.profileImageUrl ?? undefined} alt={profile?.firstName ?? ""} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {getInitials(profile?.firstName ?? null, profile?.lastName ?? null)}
                  </AvatarFallback>
                </Avatar>
                {!selectedPhoto && (
                  <label className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors shadow-sm">
                    <Camera className="h-3.5 w-3.5" />
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoSelect} />
                  </label>
                )}
                {!selectedPhoto && profile?.profileImageUrl && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={isRemovingImage}
                    className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-background/80 backdrop-blur-sm text-muted-foreground cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-all shadow-md border border-border/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove photo"
                  >
                    {isRemovingImage ? <span className="flex h-3.5 w-3.5 items-center justify-center"><span className="h-1 w-1 bg-current rounded-full animate-pulse" /></span> : <X className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <h2 className="text-xl font-semibold text-foreground" data-testid="text-profile-name">
                  {profile?.firstName} {profile?.lastName}
                </h2>
                <div className="flex items-center gap-2">
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
          {selectedPhoto && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-background flex-shrink-0">
                <img src={URL.createObjectURL(selectedPhoto)} alt="Preview" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm text-foreground truncate flex-1">{selectedPhoto.name}</span>
              <Button size="sm" variant="outline" onClick={() => setSelectedPhoto(null)} disabled={isSavingImage}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSavePhoto} disabled={isSavingImage}>
                {isSavingImage ? "Saving..." : "Save"}
              </Button>
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

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Change Password / تغيير كلمة المرور
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            type="password"
            placeholder="Current password / كلمة المرور الحالية"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="New password / كلمة المرور الجديدة"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Confirm new password / تأكيد كلمة المرور الجديدة"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button
            onClick={handleChangePassword}
            disabled={isChangingPassword}
            className="w-full"
          >
            {isChangingPassword ? "Changing..." : "Change Password / تغيير كلمة المرور"}
          </Button>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {isSubscribed ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
            Push Notifications / الإشعارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium">
                {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Get notified when admins post announcements
              </p>
              {isSubscribed && deviceCount > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {deviceCount} device{deviceCount !== 1 ? 's' : ''} registered
                </p>
              )}
              {appStatus !== 'ready' && appStatus !== 'initializing' && appStatus !== 'registering_sw' && (
                <p className="text-[10px] text-amber-600 mt-1">
                  Status: {appStatus}
                </p>
              )}
            </div>
            {isSubscribed ? (
              <Button size="sm" variant="outline" onClick={unsubscribe}>
                Disable
              </Button>
            ) : (
              <Button size="sm" onClick={async () => {
                const subscribed = await subscribe();
                if (subscribed) {
                  toast({ title: "Notifications enabled successfully" });
                } else {
                  toast({ title: "Failed to enable notifications", variant: "destructive" });
                }
              }}>
                Enable
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-2">
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
