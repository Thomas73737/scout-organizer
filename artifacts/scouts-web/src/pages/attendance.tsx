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
import { CalendarCheck, Plus, CheckCircle, XCircle, ChevronRight, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sessionDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});
type SessionForm = z.infer<typeof sessionSchema>;

function PatrolAttendanceView({ patrol, scouts, onClose }: { patrol: string; scouts: any[]; onClose: () => void }) {
  const [selectedScouts, setSelectedScouts] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateAttendanceSession();
  const submitMutation = useSubmitAttendanceRecords();
  const queryClient = useQueryClient();

  const toggleScout = (scoutId: string) => {
    setSelectedScouts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(scoutId)) {
        newSet.delete(scoutId);
      } else {
        newSet.add(scoutId);
      }
      return newSet;
    });
  };

  const handleSubmitAttendance = async () => {
    setIsSubmitting(true);
    try {
      // Create a new attendance session for today
      const sessionResponse = await createMutation.mutateAsync({
        data: {
          title: `${patrol} Patrol Attendance - ${new Date().toLocaleDateString("ar-EG")}`,
          sessionDate: new Date().toISOString(),
          notes: `Attendance for ${patrol} patrol`,
        },
      });

      const session = sessionResponse;
      
      // Submit attendance records
      const records = scouts.map((scout) => ({
        userId: scout.replitId,
        status: selectedScouts.has(scout.replitId) ? ("present" as const) : ("absent" as const),
      }));

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

  return (
    <div className="space-y-4">
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {scouts.map((scout) => (
          <div
            key={scout.id}
            className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
              selectedScouts.has(scout.replitId)
                ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                : "bg-background border-border"
            }`}
            onClick={() => toggleScout(scout.replitId)}
          >
            <span className="text-sm font-medium">
              {scout.firstName} {scout.lastName}
            </span>
            {selectedScouts.has(scout.id) ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmitAttendance}
          disabled={isSubmitting || selectedScouts.size === 0}
        >
          {isSubmitting ? "Recording..." : "Record Attendance / تسجيل الحضور"}
        </Button>
      </div>
    </div>
  );
}

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

  const [attendance, setAttendance] = useState<Record<string, "present" | "absent">>({});

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

  const toggleStatus = (userId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: prev[userId] === "present" ? "absent" : "present",
    }));
  };

  const getStatus = (userId: string, existingStatus?: string) => {
    if (userId in attendance) return attendance[userId];
    return (existingStatus as "present" | "absent") ?? "absent";
  };

  const handleSubmit = () => {
    const scouts = allUsers?.filter((u) => u.role === "scout") ?? [];
    const records = scouts.map((u) => ({
      userId: u.replitId,
      status: getStatus(u.replitId, session?.records?.find((r) => r.userId === u.replitId)?.status),
    }));

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
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {scouts.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No scouts registered yet</p>
        ) : (
          scouts.map((scout) => {
            const existingRecord = session?.records?.find((r) => r.userId === scout.replitId);
            const status = getStatus(scout.replitId, existingRecord?.status);
            return (
              <div
                key={scout.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                  status === "present" ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-background border-border"
                }`}
                onClick={() => isLeader && toggleStatus(scout.replitId)}
                data-testid={`attendance-scout-${scout.id}`}
              >
                <span className="text-sm font-medium">
                  {scout.firstName} {scout.lastName}
                </span>
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
                  {status === "present" ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant="outline" className="text-xs">
                          {session.attendedCount}/{session.totalCount} حضروا
                        </Badge>
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
