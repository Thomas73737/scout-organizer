import React, { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trophy, Medal, Award } from "lucide-react";

const getInitials = (first: string | null, last: string | null) => {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
};

interface LeaderboardEntry {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  totalPoints: number;
}

interface MyPoints {
  totalPoints: number;
  transactions: {
    id: string;
    points: number;
    reason: string;
    createdAt: string;
  }[];
}

const rankIcons = [Trophy, Medal, Award];
const rankColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myPoints, setMyPoints] = useState<MyPoints | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [lbRes, myRes] = await Promise.all([
        fetch("/api/points/leaderboard", { credentials: "include" }),
        fetch("/api/points/my", { credentials: "include" }),
      ]);
      if (lbRes.ok) {
        const data = await lbRes.json();
        setLeaderboard(data);
      }
      if (myRes.ok) {
        const data = await myRes.json();
        setMyPoints(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Leaderboard / لوحة المتصدرين</h2>
        <p className="text-sm text-muted-foreground">Scout rankings based on points</p>
      </div>

      {myPoints && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Points / نقاطي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{myPoints.totalPoints}</div>
            <p className="text-sm text-muted-foreground">total points</p>
            {myPoints.transactions.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Recent transactions:</p>
                {myPoints.transactions.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.reason}</span>
                    <span className={`font-medium ${t.points > 0 ? "text-green-600" : "text-red-600"}`}>
                      {t.points > 0 ? "+" : ""}{t.points}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {leaderboard.map((entry, index) => {
          const RankIcon = rankIcons[index] || null;
          return (
            <div
              key={entry.userId}
              className={`flex items-center gap-4 p-4 rounded-lg border ${
                entry.userId === user?.id ? "bg-primary/5 border-primary/30" : "bg-card"
              }`}
            >
              <div className="w-8 text-center shrink-0">
                {index < 3 ? (
                  RankIcon && <RankIcon className={`h-6 w-6 mx-auto ${rankColors[index]}`} />
                ) : (
                  <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                )}
              </div>
              <Avatar className="h-10 w-10 shrink-0">
                {entry.profileImageUrl && (
                  <AvatarImage src={entry.profileImageUrl} alt={entry.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(entry.firstName, entry.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {entry.firstName} {entry.lastName}
                  {entry.userId === user?.id && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold">{entry.totalPoints}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          );
        })}
        {leaderboard.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No points awarded yet / لم يتم منح نقاط بعد
          </div>
        )}
      </div>
    </div>
  );
}
