import { useState } from "react";
import {
  useListAttendanceSessions,
  useCreateAttendanceSession,
  useGetAttendanceSession,
  useSubmitAttendanceRecords,
  useListUsers,
  useGetMyAttendanceSummary,
  getListAttendanceSessionsQueryKey,
  getGetAttendanceSessionQueryKey,
} from "@workspace/api-client-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CalendarCheck, Plus, CheckCircle, XCircle, ChevronRight, Trash2, ShieldClose, ShieldCheck, Shirt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sessionDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});
type SessionForm = z.infer<typeof sessionSchema>;

type ScoutAttendanceState = Record<string, { status: "present" | "absent"; excuse: boolean; hasGear: boolean }>;

function PatrolAttendanceView({ patrol, scouts, onClose }: { patrol: string; scouts: any[]; onClose: () => void }) {
  const [attendanceState, setAttendanceState] = useState<ScoutAttendanceState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateAttendanceSession();
  const submitMutation = useSubmitAttendanceRecords();
  const queryClient = useQueryClient();

  const getScoutState = (scoutId: string) => {
    return attendanceState[scoutId] ?? { status: "absent" as const, excuse: false, hasGear: false };
  };

  const toggleStatus = (scoutId: string) => {
    setAttendanceState((prev) => {
      const current = prev[scoutId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return {
        ...prev,
        [scoutId]: {
          ...current,
          status: current.status === "present" ? "absent" : "present",
          excuse: current.status === "present" ? false : current.excuse,
        },
      };
    });
  };

  const toggleExcuse = (scoutId: string) => {
    setAttendanceState((prev) => {
      const current = prev[scoutId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return {
        ...prev,
        [scoutId]: { ...current, excuse: !current.excuse },
      };
    });
  };

  const toggleHasGear = (scoutId: string) => {
    setAttendanceState((prev) => {
      const current = prev[scoutId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return {
        ...prev,
        [scoutId]: { ...current, hasGear: !current.hasGear },
      };
    });
  };

  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    try {
      const sessionResponse = await createMutation.mutateAsync({
        data: {
          title: `${patrol} Patrol Attendance - ${new Date().toLocaleDateString("ar-EG")}`,
          sessionDate: new Date().toISOString(),
          notes: `Attendance for ${patrol} patrol`,
        },
      });

      const session = sessionResponse;

      const records = scouts.map((scout) => {
        const state = getScoutState(scout.replitId);
        return {
          userId: scout.replitId,
          status: state.status,
          excuse: state.status === "absent" ? state.excuse : undefined,
          hasGear: state.hasGear,
        };
      });

      await submitMutation.mutateAsync({
        sessionId: session.id,
        data: { records },
      });

      queryClient.invalidateQueries({ queryKey: getListAttendanceSessionsQueryKey() });
      toast({ title: "Attendance recorded successfully" });
      onClose();
    } catch (error) {
      toast({ title: "Failed to record attendance", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (scouts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No scouts in this patrol yet
      </div>
    );
  }

  const presentCount = scouts.filter((s) => getScoutState(s.replitId).status === "present").length;
  const absentCount = scouts.length - presentCount;

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {scouts.map((scout) => {
          const state = getScoutState(scout.replitId);
          return (
            <div
              key={scout.id}
              className="px-4 py-2 rounded-lg border border-border bg-background"
            >
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-2 flex-1 cursor-pointer"
                  onClick={() => toggleStatus(scout.replitId)}
                >
                  <span className="text-sm font-medium">
                    {scout.firstName} {scout.lastName}
                  </span>
                  {state.status === "present" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {state.status === "absent" && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleExcuse(scout.replitId); }}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                        state.excuse
                          ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                          : "bg-background border-border text-muted-foreground"
                      }`}
                      title={state.excuse ? "Has excuse / معذور" : "No excuse / غير معذور"}
                    >
                      {state.excuse ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldClose className="h-3.5 w-3.5" />}
                      <span>{state.excuse ? "Excused" : "No excuse"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleHasGear(scout.replitId); }}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                      state.hasGear
                        ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                    title={state.hasGear ? "Has gear / معاه العدة" : "No gear / من غير العدة"}
                  >
                    <Shirt className="h-3.5 w-3.5" />
                    <span>{state.hasGear ? "Has gear" : "No gear"}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>Present: {presentCount} / Absent: {absentCount}</span>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmitAttendance}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Recording..." : "Record Attendance / تسجيل الحضور"}
        </Button>
      </div>
    </div>
  );
}

type SessionAttendanceState = Record<string, { status: "present" | "absent"; excuse: boolean; hasGear: boolean }>;

function AttendanceSessionDetail({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { data: session, isLoading } = useGetAttendanceSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetAttendanceSessionQueryKey(sessionId) },
  });
  const { data: allUsers } = useListUsers();
  const submitMutation = useSubmitAttendanceRecords();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile } = useGetMyProfile();
  const isLeader = profile?.role === "leader" || profile?.role === "developer";
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [attendance, setAttendance] = useState<SessionAttendanceState>({});

  const handleDeleteRecord = async (userId: string) => {
    setDeletingUserId(userId);
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}/records/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      queryClient.invalidateQueries({ queryKey: getListAttendanceSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetAttendanceSessionQueryKey(sessionId) });
      toast({ title: "Attendance record removed" });
    } catch {
      toast({ title: "Failed to remove attendance record", variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getScoutState = (userId: string, existingRecord?: { status: string; excuse?: boolean; hasGear?: boolean }) => {
    if (userId in attendance) return attendance[userId];
    return {
      status: (existingRecord?.status as "present" | "absent") ?? "absent",
      excuse: existingRecord?.excuse ?? false,
      hasGear: existingRecord?.hasGear ?? false,
    };
  };

  const toggleStatus = (userId: string) => {
    setAttendance((prev) => {
      const current = prev[userId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return {
        ...prev,
        [userId]: {
          ...current,
          status: current.status === "present" ? "absent" : "present",
          excuse: current.status === "present" ? false : current.excuse,
        },
      };
    });
  };

  const toggleExcuse = (userId: string) => {
    setAttendance((prev) => {
      const current = prev[userId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return { ...prev, [userId]: { ...current, excuse: !current.excuse } };
    });
  };

  const toggleHasGear = (userId: string) => {
    setAttendance((prev) => {
      const current = prev[userId] ?? { status: "absent" as const, excuse: false, hasGear: false };
      return { ...prev, [userId]: { ...current, hasGear: !current.hasGear } };
    });
  };

  const handleSubmit = () => {
    const scouts = allUsers?.filter((u) => u.role === "scout") ?? [];
    const records = scouts.map((u) => {
      const existingRecord = session?.records?.find((r) => r.userId === u.replitId);
      const state = getScoutState(u.replitId, existingRecord);
      return {
        userId: u.replitId,
        status: state.status,
        excuse: state.status === "absent" ? state.excuse : undefined,
        hasGear: state.hasGear,
      };
    });

    submitMutation.mutate(
      { sessionId, data: { records } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceSessionsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAttendanceSessionQueryKey(sessionId) });
          toast({ title: "Attendance saved successfully" });
          onClose();
        },
        onError: () => {
          toast({ title: "Failed to save attendance", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  const scouts = allUsers?.filter((u) => u.role === "scout") ?? [];

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Session: {session?.title} — {session?.sessionDate ? new Date(session.sessionDate).toLocaleDateString("ar-EG") : ""}
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {scouts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No scouts registered yet</p>
        ) : (
          scouts.map((scout) => {
            const existingRecord = session?.records?.find((r) => r.userId === scout.replitId);
            const state = getScoutState(scout.replitId, existingRecord);
            return (
              <div key={scout.id} className="px-4 py-2 rounded-lg border border-border bg-background">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => isLeader && toggleStatus(scout.replitId)}
                    data-testid={`attendance-scout-${scout.id}`}
                  >
                    <span className="text-sm font-medium">
                      {scout.firstName} {scout.lastName}
                    </span>
                    {state.status === "present" ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isLeader && existingRecord && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteRecord(scout.replitId); }}
                        disabled={deletingUserId === scout.replitId}
                        className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove attendance record"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}

                    {state.status === "absent" && isLeader && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleExcuse(scout.replitId); }}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                          state.excuse
                            ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                        title={state.excuse ? "Has excuse / معذور" : "No excuse / غير معذور"}
                      >
                        {state.excuse ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldClose className="h-3.5 w-3.5" />}
                        <span>{state.excuse ? "Excused" : "No excuse"}</span>
                      </button>
                    )}

                    {isLeader && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); toggleHasGear(scout.replitId); }}
                        className={`flex items-center gap-1 text-xs px-2 py-1 rounded-md border transition-colors ${
                          state.hasGear
                            ? "bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-900/20 dark:border-sky-800 dark:text-sky-400"
                            : "bg-background border-border text-muted-foreground"
                        }`}
                        title={state.hasGear ? "Has gear / معاه العدة" : "No gear / من غير العدة"}
                      >
                        <Shirt className="h-3.5 w-3.5" />
                        <span>{state.hasGear ? "Has gear" : "No gear"}</span>
                      </button>
                    )}

                    {!isLeader && state.status === "absent" && (
                      <span className="text-xs text-muted-foreground">
                        {state.excuse ? "Excused" : "Unexcused"}
                      </span>
                    )}
                    {!isLeader && (
                      <span className="text-xs text-muted-foreground">
                        {state.hasGear ? "Has gear" : "No gear"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {isLeader && (
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitMutation.isPending} data-testid="button-save-attendance">
            {submitMutation.isPending ? "Saving..." : "Save / حفظ"}
          </Button>
        </DialogFooter>
      )}
    </div>
  );
}

export default function Attendance() {
  const { data: profile } = useGetMyProfile();
  const { data: sessions, isLoading } = useListAttendanceSessions();
  const { data: mySummary } = useGetMyAttendanceSummary();
  const { data: allUsers } = useListUsers();
  const createMutation = useCreateAttendanceSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedPatrol, setSelectedPatrol] = useState<string | null>(null);

  const isLeader = profile?.role === "leader" || profile?.role === "developer";
  const isAdmin = profile?.role === "leader" || profile?.role === "developer";

  const patrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];

  const scoutsByPatrol = allUsers?.filter((u) => u.role === "scout" && u.patrol).reduce((acc, scout) => {
    if (scout.patrol) {
      if (!acc[scout.patrol]) {
        acc[scout.patrol] = [];
      }
      acc[scout.patrol].push(scout);
    }
    return acc;
  }, {} as Record<string, typeof allUsers>) || {};

  const form = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { title: "", sessionDate: "", notes: "" },
  });

  const onSubmit = (values: SessionForm) => {
    createMutation.mutate(
      { data: { title: values.title, sessionDate: new Date(values.sessionDate).toISOString(), notes: values.notes } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceSessionsQueryKey() });
          setCreateDialogOpen(false);
          form.reset();
          toast({ title: "Session created" });
        },
        onError: () => {
          toast({ title: "Failed to create session", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-6" data-testid="attendance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" />
            Attendance / الحضور
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "Track and record attendance by patrol" : "Your attendance record"}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-session">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        )}
      </div>

      {/* Admin Summary */}
      {isAdmin && mySummary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">My Stats / إحصائياتي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-bold">{mySummary.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Sessions</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-green-600">{mySummary.attended}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-red-500">{mySummary.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-amber-600">{mySummary.absentExcused}</p>
                <p className="text-xs text-muted-foreground">Excused</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-orange-600">{mySummary.absentUnexcused}</p>
                <p className="text-xs text-muted-foreground">Unexcused</p>
              </div>
              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-sky-600">{mySummary.withoutGear}</p>
                <p className="text-xs text-muted-foreground">No Gear</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Patrol Selection View */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {patrols.map((patrol) => {
              const scoutsInPatrol = scoutsByPatrol[patrol] || [];
              return (
                <Card
                  key={patrol}
                  className="cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setSelectedPatrol(patrol)}
                >
                  <CardContent className="py-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-foreground mb-1">{patrol}</p>
                      <p className="text-sm text-muted-foreground">{scoutsInPatrol.length} scouts</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Scout Selection Dialog */}
          {selectedPatrol && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{selectedPatrol} Patrol / فرقة {selectedPatrol}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPatrol(null)}>Close</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PatrolAttendanceView 
                  patrol={selectedPatrol}
                  scouts={scoutsByPatrol[selectedPatrol] || []}
                  onClose={() => setSelectedPatrol(null)}
                />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Scout Summary */}
      {!isAdmin && mySummary && (
        <Card data-testid="attendance-summary">
          <CardHeader>
            <CardTitle className="text-base">My Attendance / حضوري</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Attendance rate / نسبة الحضور</span>
              <span className="font-semibold text-primary">{mySummary.rate}%</span>
            </div>
            <Progress value={mySummary.rate} className="h-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-bold">{mySummary.totalSessions}</p>
                <p className="text-xs text-muted-foreground">Total / الكل</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-green-600">{mySummary.attended}</p>
                <p className="text-xs text-muted-foreground">Present / حضور</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-red-500">{mySummary.absent}</p>
                <p className="text-xs text-muted-foreground">Absent / غياب</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-amber-600">{mySummary.absentExcused}</p>
                <p className="text-xs text-muted-foreground">Excused / معذور</p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-orange-600">{mySummary.absentUnexcused}</p>
                <p className="text-xs text-muted-foreground">Unexcused / غير معذور</p>
              </div>
              <div className="bg-sky-50 dark:bg-sky-900/20 rounded-lg p-3">
                <p className="text-xl font-bold text-sky-600">{mySummary.withoutGear}</p>
                <p className="text-xs text-muted-foreground">Without Gear / من غير العدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : sessions?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No sessions yet
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions?.map((session) => (
              <Card
                key={session.id}
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => setSelectedSessionId(session.id)}
                data-testid={`session-card-${session.id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{session.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(session.sessionDate).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right flex items-center gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {session.attendedCount}/{session.totalCount} حاضر
                        </Badge>
                        {session.excusedCount !== undefined && session.excusedCount > 0 && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                            {session.excusedCount} معذور
                          </Badge>
                        )}
                        {session.withGearCount !== undefined && session.withGearCount > 0 && (
                          <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800">
                            {session.withGearCount} عدة
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </>

      {/* Create Session Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Session / جلسة جديدة</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Title / اسم الجلسة</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly Meeting" data-testid="input-session-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sessionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date / التاريخ</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" data-testid="input-session-date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional) / ملاحظات</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional notes" data-testid="input-session-notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-session">
                  {createMutation.isPending ? "Creating..." : "Create / إنشاء"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Attendance Detail Dialog */}
      <Dialog open={selectedSessionId !== null} onOpenChange={(open) => !open && setSelectedSessionId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Attendance Record / سجل الحضور</DialogTitle>
          </DialogHeader>
          {selectedSessionId && (
            <AttendanceSessionDetail
              sessionId={selectedSessionId}
              onClose={() => setSelectedSessionId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
