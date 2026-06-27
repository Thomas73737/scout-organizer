import { useState } from "react";
import {
  useListPosts,
  useCreatePost,
  useDeletePost,
  useRequestUploadUrl,
  getListPostsQueryKey,
} from "@workspace/api-client-react";
import { useGetMyProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Form, FormField, FormItem, FormControl, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessageSquare, Trash2, Paperclip, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const postSchema = z.object({
  content: z.string().min(1, "Write something first"),
});
type PostForm = z.infer<typeof postSchema>;

export default function Posts() {
  const { data: profile } = useGetMyProfile();
  const { data: posts, isLoading } = useListPosts();
  const createMutation = useCreatePost();
  const deleteMutation = useDeletePost();
  const uploadUrlMutation = useRequestUploadUrl();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const onSubmit = async (values: PostForm) => {
    let fileUrl: string | undefined;
    let fileName: string | undefined;
    let fileType: string | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const urlResult = await new Promise<{ uploadURL: string; objectPath: string }>((resolve, reject) => {
          uploadUrlMutation.mutate(
            { data: { name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type } },
            {
              onSuccess: resolve,
              onError: reject,
            }
          );
        });

        await fetch(urlResult.uploadURL, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });

        fileUrl = urlResult.objectPath;
        fileName = selectedFile.name;
        fileType = selectedFile.type;
      } catch {
        toast({ title: "File upload failed", variant: "destructive" });
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    createMutation.mutate(
      { data: { content: values.content, fileUrl, fileName, fileType } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          form.reset();
          setSelectedFile(null);
          toast({ title: "Post shared successfully" });
        },
        onError: () => {
          toast({ title: "Failed to create post", variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = (postId: number) => {
    deleteMutation.mutate(
      { postId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          toast({ title: "Post deleted" });
        },
      }
    );
  };

  const canDelete = (post: any) => {
    if (profile?.role === "leader") return true;
    return post.authorId === profile?.id;
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const isFilePdf = (type?: string | null) => type?.includes("pdf");
  const isFilePpt = (type?: string | null) =>
    type?.includes("presentation") || type?.includes("powerpoint");

  return (
    <div className="space-y-6" data-testid="posts-page">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-secondary" />
          Community / المجتمع
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Share files, notes, and updates with the group</p>
      </div>

      {/* Create Post */}
      <Card>
        <CardContent className="pt-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Share something with the group... / شارك شيئاً مع المجموعة..."
                        rows={3}
                        data-testid="textarea-post-content"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                  <FileText className="h-4 w-4" />
                  <span className="flex-1 truncate">{selectedFile.name}</span>
                  <button type="button" onClick={() => setSelectedFile(null)}>
                    <X className="h-4 w-4 hover:text-destructive" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <label className="cursor-pointer flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors" data-testid="button-attach-file">
                  <Paperclip className="h-4 w-4" />
                  Attach file
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.ppt,.pptx,image/*"
                    onChange={handleFileSelect}
                  />
                </label>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || isUploading}
                  data-testid="button-submit-post"
                >
                  {isUploading ? "Uploading..." : createMutation.isPending ? "Posting..." : "Post / نشر"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Posts List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : posts?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No posts yet — be the first to share something!
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} data-testid={`post-card-${post.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {post.authorImageUrl && <AvatarImage src={post.authorImageUrl} alt={post.authorName ?? ""} />}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(post.authorName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-foreground">{post.authorName}</span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {post.authorRole}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("ar-EG")}
                      </p>
                    </div>
                  </div>
                  {canDelete(post) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                      onClick={() => handleDelete(post.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-post-${post.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{post.content}</p>
                {post.fileUrl && (
                  <a
                    href={`/api/storage/objects/${post.fileUrl.replace(/^\/objects\//, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline bg-muted/50 rounded-md px-3 py-2 w-fit"
                    data-testid={`link-post-file-${post.id}`}
                  >
                    {isFilePdf(post.fileType) || isFilePpt(post.fileType) ? (
                      <FileText className="h-4 w-4" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    {post.fileName ?? "Attached file"}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
