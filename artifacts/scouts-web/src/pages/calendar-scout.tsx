import React, { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetMyProfile } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Loader2, CalendarDays, MapPin, Clock, StickyNote } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CalendarEvent {
  _id: string;
  id: string;
  title: string;
  date: string;
  time: string;
  place: string;
  notes: string;
  createdByUserId: string;
  createdAt: string;
}

export default function CalendarPage() {
  const { data: profile } = useGetMyProfile();
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [sendAnnouncement, setSendAnnouncement] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLeader = profile?.role === "leader" || profile?.role === "developer" || profile?.role === "cp_of_cps";

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/calendar", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDate("");
    setTime("");
    setPlace("");
    setNotes("");
    setSendAnnouncement(false);
    setEditingEvent(null);
  };

  const openEdit = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDate(event.date);
    setTime(event.time || "");
    setPlace(event.place || "");
    setNotes(event.notes || "");
    setDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!title || !date) return;
    setSaving(true);
    try {
      if (editingEvent) {
        const res = await fetch(`/api/calendar/${editingEvent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, date, time, place, notes }),
        });
        if (res.ok) {
          toast({ title: "Event updated / تم تحديث الحدث" });
        } else {
          toast({ title: "Failed to update event", variant: "destructive" });
        }
      } else {
        const res = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, date, time, place, notes, sendAnnouncement }),
        });
        if (res.ok) {
          toast({ title: "Event created / تم إنشاء الحدث" });
        } else {
          toast({ title: "Failed to create event", variant: "destructive" });
        }
      }
      setDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch {}
    setSaving(false);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this event? / حذف هذا الحدث؟")) return;
    try {
      const res = await fetch(`/api/calendar/${eventId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Event deleted / تم حذف الحدث" });
        fetchEvents();
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">2026 Calendar / التقويم</h2>
          <p className="text-sm text-muted-foreground">Scout events schedule</p>
        </div>
        {isLeader && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Add Event / إضافة حدث
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEvent ? "Edit Event / تعديل الحدث" : "New Event / حدث جديد"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Title / العنوان</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" />
                </div>
                <div>
                  <label className="text-sm font-medium">Date / التاريخ</label>
                  <Input value={date} onChange={(e) => setDate(e.target.value)} placeholder="e.g. 15/6 - 22/6" />
                </div>
                <div>
                  <label className="text-sm font-medium">Time / الوقت</label>
                  <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. Monday 5:30PM-9:00PM" />
                </div>
                <div>
                  <label className="text-sm font-medium">Place / المكان</label>
                  <Input value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Location" />
                </div>
                <div>
                  <label className="text-sm font-medium">Notes / ملاحظات</label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes..." />
                </div>
                {!editingEvent && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendAnnouncement}
                      onChange={(e) => setSendAnnouncement(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Send as announcement / إرسال كإعلان</span>
                  </label>
                )}
                <Button onClick={handleSave} disabled={saving || !title || !date} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {editingEvent ? "Update / تحديث" : "Create / إنشاء"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id || event._id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base">{event.title}</CardTitle>
                {isLeader && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(event)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(event.id || event._id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{event.date}</span>
              </div>
              {event.time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>{event.time}</span>
                </div>
              )}
              {event.place && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{event.place}</span>
                </div>
              )}
              {event.notes && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <StickyNote className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{event.notes}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No events yet / لا توجد أحداث بعد
          </div>
        )}
      </div>
    </div>
  );
}
