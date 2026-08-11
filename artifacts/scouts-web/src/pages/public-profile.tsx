import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { UserCircle, Mail, Award, Target, Heart, ArrowLeft, Send } from "lucide-react";
import { BadgeSection } from "@/components/badges/BadgeCard";

export default function PublicProfile() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/users/${userId}/profile`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [userId]);

  const getInitials = (first: string | null, last: string | null) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

  if (loading) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="space-y-6 max-w-xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-serif font-bold text-foreground">Profile</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">{error || "User not found"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-serif font-bold text-foreground">
          Profile / الملف الشخصي
        </h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16">
              {profile.profileImageUrl && (
                <AvatarImage src={profile.profileImageUrl} alt={profile.firstName ?? ""} />
              )}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {getInitials(profile.firstName, profile.lastName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold text-foreground">
                {profile.firstName} {profile.lastName}
              </h2>
              <div className="flex items-center gap-2">
                <Badge
                  className="capitalize"
                  variant={profile.role === "leader" || profile.role === "developer" || profile.role === "cp_of_cps" || profile.role === "cp" ? "default" : "secondary"}
                >
                  {profile.role === "leader" ? "Leader" : profile.role === "developer" ? "Developer" : profile.role === "cp_of_cps" ? "CP of CPs" : profile.role === "cp" ? "CP" : "Scout"}
                </Badge>
                {profile.patrol && (
                  <Badge variant="outline" className="text-xs">{profile.patrol}</Badge>
                )}
              </div>
            </div>
          </div>
          {profile.email && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{profile.email}</span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 gap-2"
            onClick={() => window.location.href = `/chat?user=${profile.replitId}`}
          >
            <Send className="h-4 w-4" />
            Chat / دردشة
          </Button>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            Badges / الشارات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BadgeSection
            title="Main Badge"
            badges={profile.mainBadge ? [profile.mainBadge] : []}
            category="main"
            emptyMessage="No Main Badge"
            emptyIcon={Award}
          />
          <BadgeSection
            title="Proficiency Badges"
            badges={profile.proficiencyBadges || []}
            category="proficiency"
            emptyMessage="No proficiency badges yet"
            emptyIcon={Target}
          />
          <BadgeSection
            title="Hobby Badges"
            badges={profile.hobbyBadges || []}
            category="hobby"
            emptyMessage="No hobby badges yet"
            emptyIcon={Heart}
          />
        </CardContent>
      </Card>
    </div>
  );
}
