import { useEffect, useState } from "react";
import { useListUsers, useUpdateUserRole, getListUsersQueryKey, useGetMyProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Admin() {
  const { data: users, isLoading } = useListUsers();
  const { data: currentUser } = useGetMyProfile();
  const updateRoleMutation = useUpdateUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const updatePatrolMutation = useMutation({
    mutationFn: async ({ userId, patrol }: { userId: string; patrol: string }) => {
      const response = await fetch(`/api/users/${userId}/patrol`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patrol }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to update patrol");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "Patrol updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update patrol", variant: "destructive" });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch("/api/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to ban user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User banned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to ban user", variant: "destructive" });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch("/api/users/unban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to unban user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User unbanned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to unban user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      toast({ title: "User deleted successfully" });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });
  const [requests, setRequests] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    team: string;
    status: string;
    createdAt: string;
    isNewScout: boolean;
    whatsappNumber?: string;
    parentsWhatsappNumber?: string;
    homeAddress?: string;
    photoUrl?: string;
    patrol?: string;
  }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestActionPending, setRequestActionPending] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setRequestsLoading(true);
      try {
        const response = await fetch("/api/access-requests", {
        credentials: "include",
      });
        if (!response.ok) {
          throw new Error("Failed to load access requests");
        }
        const data = await response.json();
        setRequests(data);
      } catch (error) {
        toast({ title: "Unable to load access requests", variant: "destructive" });
      } finally {
        setRequestsLoading(false);
      }
    };
    fetchRequests();
  }, [toast]);

  const handleRequestAction = async (requestId: string, action: "approve" | "deny") => {
    setRequestActionPending(requestId);
    try {
      const response = await fetch(`/api/access-requests/${requestId}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to update request");
      }
      toast({ title: `Request ${action}ed successfully` });
      setRequests((current) =>
        current.map((request) =>
          request.id === requestId ? { ...request, status: action === "approve" ? "approved" : "denied" } : request,
        ),
      );
    } catch {
      toast({ title: `Failed to ${action} request`, variant: "destructive" });
    } finally {
      setRequestActionPending(null);
    }
  };

  const handleRoleChange = (userId: string, role: "scout" | "leader" | "developer") => {
    updateRoleMutation.mutate(
      { userId, data: { role } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
          toast({ title: `Role updated to ${role}` });
        },
        onError: () => {
          toast({ title: "Failed to update role", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteUser = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete);
    }
  };

  const getInitials = (first: string | null, last: string | null) => {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
  };

  const scouts = users?.filter((u) => u.role === "scout") ?? [];
  const leaders = users?.filter((u) => u.role === "leader") ?? [];
  const developers = users?.filter((u) => u.role === "developer") ?? [];
  const patrols = ["صقر", "فهد", "ثعلب", "ذئب", "نمر", "نسر", "أسد", "غراب", "بلبل", "ديك", "خفاش", "غزال"];
  const isDeveloper = currentUser?.role === "developer" || currentUser?.role === "leader";

  return (
    <div className="space-y-6" data-testid="admin-page">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Admin / الإدارة
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage member roles and permissions</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <Users className="h-5 w-5 text-secondary" />
            <div>
              <p className="text-2xl font-bold">{scouts.length}</p>
              <p className="text-xs text-muted-foreground">Scouts / كشافة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold">{leaders.length}</p>
              <p className="text-xs text-muted-foreground">Leaders / قادة</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 flex items-center gap-3">
            <Shield className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{developers.length}</p>
              <p className="text-xs text-muted-foreground">Developers / مطورين</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New Scout Requests / طلبات الكشافة الجدد</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : requests.filter(r => r.isNewScout).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No new scout requests</p>
          ) : (
            <div className="space-y-3">
              {requests.filter(r => r.isNewScout).map((request) => (
                <div key={request.id} className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.name}</p>
                      <p className="text-sm text-muted-foreground">{request.phone} • {request.team}</p>
                      {request.patrol && (
                        <p className="text-xs text-muted-foreground">Patrol: {request.patrol}</p>
                      )}
                      {request.whatsappNumber && (
                        <p className="text-xs text-muted-foreground">WhatsApp: {request.whatsappNumber}</p>
                      )}
                      {request.parentsWhatsappNumber && (
                        <p className="text-xs text-muted-foreground">Parents WhatsApp: {request.parentsWhatsappNumber}</p>
                      )}
                      {request.homeAddress && (
                        <p className="text-xs text-muted-foreground">Address: {request.homeAddress}</p>
                      )}
                    </div>
                    <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                      {request.status}
                    </Badge>
                  </div>
                  {request.photoUrl && (
                    <div className="mt-2">
                      <img src={request.photoUrl} alt={request.name} className="w-16 h-16 rounded-lg object-cover" />
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={request.status !== "pending" || requestActionPending === request.id}
                      onClick={() => handleRequestAction(request.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={request.status !== "pending" || requestActionPending === request.id}
                      onClick={() => handleRequestAction(request.id, "deny")}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existing Scout Requests / طلبات الكشافة الحاليين</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : requests.filter(r => !r.isNewScout).length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No existing scout requests</p>
          ) : (
            <div className="space-y-3">
              {requests.filter(r => !r.isNewScout).map((request) => (
                <div key={request.id} className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.name}</p>
                      <p className="text-sm text-muted-foreground">{request.phone} • {request.team}</p>
                      {request.patrol && (
                        <p className="text-xs text-muted-foreground">Patrol: {request.patrol}</p>
                      )}
                    </div>
                    <Badge variant={request.status === "pending" ? "secondary" : request.status === "approved" ? "default" : "destructive"}>
                      {request.status}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={request.status !== "pending" || requestActionPending === request.id}
                      onClick={() => handleRequestAction(request.id, "approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={request.status !== "pending" || requestActionPending === request.id}
                      onClick={() => handleRequestAction(request.id, "deny")}
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Members / جميع الأعضاء</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : users?.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No members yet</p>
          ) : (
            <div className="divide-y divide-border">
              {users?.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-3 gap-3" data-testid={`user-row-${user.id}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9 shrink-0">
                      {user.profileImageUrl && (
                        <AvatarImage src={user.profileImageUrl} alt={user.firstName ?? ""} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex gap-2">
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user.replitId, val as "scout" | "leader" | "developer")}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scout">Scout / كشاف</SelectItem>
                        <SelectItem value="leader">Leader / قائد</SelectItem>
                        <SelectItem value="developer">Developer / مطور</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={user.patrol || ""}
                      onValueChange={(val) => updatePatrolMutation.mutate({ userId: user.replitId, patrol: val })}
                      disabled={updatePatrolMutation.isPending}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue placeholder="Patrol" />
                      </SelectTrigger>
                      <SelectContent>
                        {patrols.map((patrol) => (
                          <SelectItem key={patrol} value={patrol}>{patrol}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs"
                      onClick={() => banUserMutation.mutate(user.replitId)}
                      disabled={banUserMutation.isPending}
                    >
                      Ban
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => unbanUserMutation.mutate(user.replitId)}
                      disabled={unbanUserMutation.isPending}
                    >
                      Unban
                    </Button>
                    {isDeveloper && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs"
                        onClick={() => handleDeleteUser(user.replitId)}
                        disabled={deleteUserMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user account? This action cannot be undone and will permanently remove all user data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
