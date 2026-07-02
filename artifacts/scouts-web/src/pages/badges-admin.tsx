import { useState, useMemo } from "react";
import { useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Medal, Star, Users, Plus, X, Search, Award } from "lucide-react";
import { BadgeChip } from "@/components/badges/BadgeCard";
import { MAIN_BADGES, PROFICIENCY_BADGES, HOBBY_BADGES, BADGE_META } from "@/components/badges/badge-constants";
import { Input } from "@/components/ui/input";

type BadgeCategory = "main" | "proficiency" | "hobby";

const CATEGORIES: { value: BadgeCategory; label: string; labelAr: string; icon: any; color: string }[] = [
  { value: "main", label: "Main Badges", labelAr: "الشارات الرئيسية", icon: Award, color: "text-amber-500" },
  { value: "proficiency", label: "Proficiency Badges", labelAr: "شارات الكفاءة", icon: Medal, color: "text-blue-500" },
  { value: "hobby", label: "Hobby Badges", labelAr: "شارات الهواية", icon: Star, color: "text-green-500" },
];

function getBadgesForCategory(category: BadgeCategory): readonly string[] {
  switch (category) {
    case "main": return MAIN_BADGES;
    case "proficiency": return PROFICIENCY_BADGES;
    case "hobby": return HOBBY_BADGES;
  }
}

function getScoutBadges(user: any, category: BadgeCategory): string[] {
  switch (category) {
    case "main": return user.mainBadge ? [user.mainBadge] : [];
    case "proficiency": return user.proficiencyBadges || [];
    case "hobby": return user.hobbyBadges || [];
  }
}

function badgeFieldForCategory(category: BadgeCategory): string {
  switch (category) {
    case "main": return "mainBadge";
    case "proficiency": return "proficiencyBadges";
    case "hobby": return "hobbyBadges";
  }
}

export default function BadgesAdmin() {
  const { data: users, isLoading: usersLoading } = useListUsers();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [category, setCategory] = useState<BadgeCategory>("proficiency");
  const [selectedBadge, setSelectedBadge] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const scouts = useMemo(() => (users || []).filter((u) => u.role === "scout"), [users]);

  const badges = getBadgesForCategory(category);

  const scoutsWithBadge = useMemo(() => {
    if (!selectedBadge) return [];
    if (category === "main") {
      return scouts.filter((s) => s.mainBadge === selectedBadge);
    }
    const field = badgeFieldForCategory(category) as "proficiencyBadges" | "hobbyBadges";
    return scouts.filter((s) => (s[field] || []).includes(selectedBadge));
  }, [scouts, selectedBadge, category]);

  const scoutsWithoutBadge = useMemo(() => {
    if (!selectedBadge) return [];
    if (category === "main") {
      return scouts.filter((s) => s.mainBadge !== selectedBadge && !s.mainBadge);
    }
    const field = badgeFieldForCategory(category) as "proficiencyBadges" | "hobbyBadges";
    return scouts.filter((s) => !(s[field] || []).includes(selectedBadge));
  }, [scouts, selectedBadge, category]);

  const filteredWithBadge = useMemo(() => {
    if (!searchQuery) return scoutsWithBadge;
    const q = searchQuery.toLowerCase();
    return scoutsWithBadge.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q),
    );
  }, [scoutsWithBadge, searchQuery]);

  const filteredWithoutBadge = useMemo(() => {
    if (!addSearch) return scoutsWithoutBadge.slice(0, 20);
    const q = addSearch.toLowerCase();
    return scoutsWithoutBadge.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
        s.firstName?.toLowerCase().includes(q) ||
        s.lastName?.toLowerCase().includes(q),
    );
  }, [scoutsWithoutBadge, addSearch]);

  const apiCall = async (method: string, url: string, body?: any) => {
    setActionLoading(url);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }
      return await res.json();
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddScout = async (userId: string) => {
    if (!selectedBadge) return;
    try {
      if (category === "main") {
        await apiCall("PUT", `/api/badges/${userId}/main-badge`, { badge: selectedBadge });
      } else {
        const path = category === "proficiency" ? "proficiency" : "hobby";
        await apiCall("POST", `/api/badges/${userId}/${path}`, { badge: selectedBadge });
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: `Assigned ${selectedBadge}` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleRemoveScout = async (userId: string) => {
    if (!selectedBadge) return;
    try {
      if (category === "main") {
        await apiCall("DELETE", `/api/badges/${userId}/main-badge`);
      } else {
        const path = category === "proficiency" ? "proficiency" : "hobby";
        await apiCall("DELETE", `/api/badges/${userId}/${path}/${encodeURIComponent(selectedBadge)}`);
      }
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: `Removed ${selectedBadge}` });
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const handleRemoveAllFromBadge = async () => {
    if (!selectedBadge || !scoutsWithBadge.length) return;
    if (!confirm(`Remove "${selectedBadge}" from all ${scoutsWithBadge.length} scouts?`)) return;
    for (const scout of scoutsWithBadge) {
      await handleRemoveScout(scout.replitId);
    }
    toast({ title: `Removed ${selectedBadge} from all scouts` });
  };

  const getInitials = (first: string | null, last: string | null) =>
    `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

  const meta = selectedBadge ? BADGE_META[selectedBadge] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <Medal className="h-6 w-6 text-primary" />
          Badge Management / إدارة الشارات
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Select a badge, then add or remove scouts
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => { setCategory(cat.value); setSelectedBadge(""); }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 hover:shadow-md cursor-pointer
                    ${category === cat.value
                      ? `${cat.color} border-current bg-muted/50`
                      : "border-border hover:border-muted-foreground/30"
                    }`}
                >
                  <Icon className={`h-6 w-6 ${cat.color}`} />
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">{cat.labelAr}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badge Selector */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              Select Badge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedBadge} onValueChange={setSelectedBadge}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a badge..." />
              </SelectTrigger>
              <SelectContent>
                {badges.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {meta && (
              <div className={`mt-4 p-4 rounded-xl ${meta.bgColor} ${meta.borderColor} border-2`}>
                <div className="flex items-center gap-3">
                  <div className={meta.color}>
                    <meta.icon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{selectedBadge}</p>
                    <p className="text-xs text-muted-foreground capitalize">{category} badge</p>
                  </div>
                </div>
              </div>
            )}

            {selectedBadge && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Scouts with badge</span>
                  <span className="font-bold text-foreground">{scoutsWithBadge.length}</span>
                </div>
                {scoutsWithBadge.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-destructive"
                    onClick={handleRemoveAllFromBadge}
                  >
                    Remove from all
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scouts with badge */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {selectedBadge ? `Scouts with "${selectedBadge}"` : "Select a badge"}
              </CardTitle>
              {selectedBadge && (
                <Input
                  placeholder="Search scouts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-48 h-8 text-xs"
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedBadge ? (
              <p className="text-sm text-muted-foreground text-center py-8 italic">
                Select a badge from the left panel
              </p>
            ) : usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredWithBadge.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground italic">No scouts have this badge yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredWithBadge.map((scout) => (
                  <div key={scout.replitId} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 shrink-0">
                        {scout.profileImageUrl && (
                          <AvatarImage src={scout.profileImageUrl} alt={scout.firstName ?? ""} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                          {getInitials(scout.firstName, scout.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {scout.firstName} {scout.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {scout.email || scout.patrol || ""}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs shrink-0"
                      onClick={() => handleRemoveScout(scout.replitId)}
                      disabled={actionLoading !== null}
                    >
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add scouts section */}
      {selectedBadge && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-green-500" />
              Add Scouts to "{selectedBadge}"
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Search scouts to add..."
                value={addSearch}
                onChange={(e) => setAddSearch(e.target.value)}
                className="max-w-md"
              />
            </div>
            {filteredWithoutBadge.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 italic">
                All scouts already have this badge
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {filteredWithoutBadge.map((scout) => (
                  <button
                    key={scout.replitId}
                    onClick={() => handleAddScout(scout.replitId)}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary hover:bg-accent/50 transition-all cursor-pointer disabled:opacity-50 text-left"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      {scout.profileImageUrl && (
                        <AvatarImage src={scout.profileImageUrl} alt={scout.firstName ?? ""} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                        {getInitials(scout.firstName, scout.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-foreground truncate">
                      {scout.firstName} {scout.lastName}
                    </span>
                    <Plus className="h-3 w-3 text-green-500 ml-auto shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
