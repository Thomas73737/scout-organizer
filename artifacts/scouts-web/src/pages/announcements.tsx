import { useState } from "react";
import {
  useListAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useCreateAnnouncementReply,
  useDeleteAnnouncementReply,
  getListAnnouncementsQueryKey,
} from "@workspace/api-client-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import type { Announcement, AnnouncementInput, AnnouncementReply, AnnouncementReplyInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Bell, Plus, Trash2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
});
type AnnouncementForm = z.infer<typeof announcementSchema>;

function getInitials(name: string | null) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function ReplyItem({
  reply,
  canDelete,
  onDelete,
  isDeleting,
}: {
  reply: AnnouncementReply;
  canDelete: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="flex gap-3 rounded-lg bg-muted/50 p-3" data-testid={`announcement-reply-${reply.id}`}>
      <Avatar className="h-8 w-8 shrink-0">
        {reply.authorImageUrl ? (
          <AvatarImage src={reply.authorImageUrl} alt={reply.authorName ?? "Reply author"} />
        ) : null}
        <AvatarFallback className="text-xs">{getInitials(reply.authorName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{reply.authorName ?? "Unknown"}</span>
            <span>·</span>
            <span>{new Date(reply.createdAt).toLocaleString("ar-EG")}</span>
          </div>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-6 w-6 shrink-0"
              onClick={onDelete}
              disabled={isDeleting}
              data-testid={`button-delete-reply-${reply.id}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap break-words mt-1">{reply.content}</p>
      </div>
    </div>
  );
}

function ReplySection({
  announcement,
  currentUserId,
  isLeader,
}: {
  announcement: Announcement;
  currentUserId: string | undefined;
  isLeader: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createReplyMutation = useCreateAnnouncementReply();
  const deleteReplyMutation = useDeleteAnnouncementReply();
  const [content, setContent] = useState("");

  const replies = announcement.replies ?? [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });

  const handleSubmitReply = () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    createReplyMutation.mutate(
      {
        announcementId: announcement.id,
        data: { content: trimmed } as AnnouncementReplyInput,
      },
      {
        onSuccess: () => {
          setContent("");
          invalidate();
          toast({ title: "Reply sent" });
        },
        onError: () => {
          toast({ title: "Failed to send reply", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteReply = (reply: AnnouncementReply) => {
    deleteReplyMutation.mutate(
      { announcementId: announcement.id, replyId: reply.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Reply deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete reply", variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="space-y-3" data-testid={`announcement-replies-${announcement.id}`}>
      <div className="flex items-center gap-2 pt-1">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">
          Replies / الردود ({replies.length})
        </span>
      </div>

      {replies.length > 0 && (
        <div className="space-y-2">
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              canDelete={isLeader || reply.authorUserId === currentUserId}
              onDelete={() => handleDeleteReply(reply)}
              isDeleting={deleteReplyMutation.isPending}
            />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          placeholder="Write a reply..."
          rows={2}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          data-testid={`input-announcement-reply-${announcement.id}`}
        />
        <Button
          className="shrink-0 self-end"
          onClick={handleSubmitReply}
          disabled={!content.trim() || createReplyMutation.isPending}
          data-testid={`button-submit-reply-${announcement.id}`}
        >
          {createReplyMutation.isPending ? "Sending..." : "Reply / رد"}
        </Button>
      </div>
    </div>
  );
}

export default function Announcements() {
  const { data: profile } = useGetMyProfile();
  const { data: announcements, isLoading } = useListAnnouncements();
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const isLeader = profile?.role === "leader" || profile?.role === "developer";

  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: { title: "", content: "" },
  });

  const onSubmit = (values: AnnouncementForm) => {
    createMutation.mutate(
      { data: values as AnnouncementInput },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          setDialogOpen(false);
          form.reset();
          toast({ title: "Announcement sent successfully" });
        },
        onError: () => {
          toast({ title: "Failed to send announcement", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(
      { announcementId: id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() });
          toast({ title: "Announcement deleted" });
        },
      }
    );
  };

  return (
    <div className="space-y-6" data-testid="announcements-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Announcements / الإعلانات
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Updates from the group leadership</p>
        </div>
        {isLeader && (
          <Button onClick={() => setDialogOpen(true)} data-testid="button-new-announcement">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : announcements?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No announcements yet
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements?.map((ann) => (
            <Card key={ann.id} data-testid={`announcement-card-${ann.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base font-semibold">{ann.title}</CardTitle>
                  {isLeader && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                      onClick={() => handleDelete(ann.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-announcement-${ann.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{ann.authorName}</span>
                  <span>·</span>
                  <span>{new Date(ann.createdAt).toLocaleDateString("ar-EG")}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{ann.content}</p>
                <ReplySection
                  announcement={ann}
                  currentUserId={profile?.replitId}
                  isLeader={isLeader}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Announcement / إعلان جديد</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title / العنوان</FormLabel>
                    <FormControl>
                      <Input placeholder="Announcement title" data-testid="input-announcement-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content / المحتوى</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your announcement..."
                        rows={4}
                        data-testid="textarea-announcement-content"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-announcement">
                  {createMutation.isPending ? "Sending..." : "Send / إرسال"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
