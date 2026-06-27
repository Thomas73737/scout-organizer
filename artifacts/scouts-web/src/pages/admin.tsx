import { useEffect, useState } from "react";
import { useListUsers, useUpdateUserRole, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const { data: users, isLoading } = useListUsers();
  const updateRoleMutation = useUpdateUserRole();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [requests, setRequests] = useState<Array<{
    id: string;
    name: string;
    phone: string;
    team: string;
    status: string;
    createdAt: string;
  }>>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestActionPending, setRequestActionPending] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      setRequestsLoading(true);
      try {
        const response = await fetch("/api/access-requests");
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

  const handleRoleChange = (userId: string, role: "scout" | "leader") => {
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

  const getInitials = (first: string | null, last: string | null) => {
    return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
  };

  const scouts = users?.filter((u) => u.role === "scout") ?? [];
  const leaders = users?.filter((u) => u.role === "leader") ?? [];

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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending Access Requests / طلبات الانضمام</CardTitle>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : requests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No pending requests</p>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{request.name}</p>
                      <p className="text-sm text-muted-foreground">{request.phone} • {request.team}</p>
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
                  <div className="shrink-0">
                    <Select
                      value={user.role}
                      onValueChange={(val) => handleRoleChange(user.replitId, val as "scout" | "leader")}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scout">Scout / كشاف</SelectItem>
                        <SelectItem value="leader">Leader / قائد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
