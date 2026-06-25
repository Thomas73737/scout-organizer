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
import { CalendarCheck, Plus, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const sessionSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sessionDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});
type SessionForm = z.infer<typeof sessionSchema>;

function AttendanceSessionDetail({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const { data: session, isLoading } = useGetAttendanceSession(sessionId, {
    query: { enabled: !!sessionId, queryKey: getGetAttendanceSessionQueryKey(sessionId) },
  });
  const { data: allUsers } = useListUsers();
  const submitMutation = useSubmitAttendanceRecords();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile } = useGetMyProfile();
  const isLeader = profile?.role === "leader";

  const [attendance, setAttendance] = useState<Record<number, "present" | "absent">>({});

  const toggleStatus = (userId: number) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: prev[userId] === "present" ? "absent" : "present",
    }));
  };

  const getStatus = (userId: number, existingStatus?: string) => {
    if (userId in attendance) return attendance[userId];
    return (existingStatus as "present" | "absent") ?? "absent";
  };

  const handleSubmit = () => {
    const scouts = allUsers?.filter((u) => u.role === "scout") ?? [];
    const records = scouts.map((u) => ({
      userId: u.id,
      status: getStatus(u.id, session?.records?.find((r) => r.userId === u.id)?.status),
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
            const existingRecord = session?.records?.find((r) => r.userId === scout.id);
            const status = getStatus(scout.id, existingRecord?.status);
            return (
              <div
                key={scout.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                  status === "present" ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : "bg-background border-border"
                }`}
                onClick={() => isLeader && toggleStatus(scout.id)}
                data-testid={`attendance-scout-${scout.id}`}
              >
                <span className="text-sm font-medium">
                  {scout.firstName} {scout.lastName}
                </span>
                {status === "present" ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
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
  const createMutation = useCreateAttendanceSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  const isLeader = profile?.role === "leader";

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
            {isLeader ? "Track and record attendance for all sessions" : "Your attendance record"}
          </p>
        </div>
        {isLeader && (
          <Button onClick={() => setCreateDialogOpen(true)} data-testid="button-new-session">
            <Plus className="h-4 w-4 mr-2" />
            New Session
          </Button>
        )}
      </div>

      {/* Scout Summary */}
      {!isLeader && mySummary && (
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
            <div className="grid grid-cols-3 gap-3 text-center">
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
