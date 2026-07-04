import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useSearch } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Pencil, Trash2, X, Check, ArrowLeft, Reply } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const getInitials = (first: string | null, last: string | null) => {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
};

interface Conversation {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface Message {
  _id?: string;
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string | null;
  senderImageUrl: string | null;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: { content: string; senderName: string } | null;
  replyToId?: string | null;
}

export default function Chat() {
  const { user } = useAuth();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const urlUserId = params.get("user");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(urlUserId);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [showConversations, setShowConversations] = useState(!urlUserId);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch {}
  }, []);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    try {
      const res = await fetch(`/api/chat/messages/${otherUserId}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch {}
  }, []);

  const startPolling = useCallback((otherUserId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchMessages(otherUserId);
      fetchConversations();
    }, 3000);
  }, [fetchMessages, fetchConversations]);

  useEffect(() => {
    fetchConversations().then(() => setLoading(false));
    const convInterval = setInterval(fetchConversations, 5000);
    return () => {
      clearInterval(convInterval);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      startPolling(selectedUserId);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedUserId, fetchMessages, startPolling]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || sending) return;
    setSending(true);
    try {
      const body: Record<string, string> = { receiverId: selectedUserId, content: newMessage.trim() };
      if (replyToId) body.replyToId = replyToId;
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNewMessage("");
        setReplyToId(null);
        fetchMessages(selectedUserId);
        fetchConversations();
      }
    } catch {}
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingId || savingEdit) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/chat/messages/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editContent.trim() }),
      });
      if (res.ok) {
        cancelEdit();
        if (selectedUserId) fetchMessages(selectedUserId);
        fetchConversations();
      }
    } catch {}
    setSavingEdit(false);
  };

  const editKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    }
    if (e.key === "Escape") {
      cancelEdit();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/chat/messages/${deleteTarget}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        if (selectedUserId) fetchMessages(selectedUserId);
        fetchConversations();
      }
    } catch {}
    setDeleteTarget(null);
  };

  const selectedUser = conversations.find((c) => c.userId === selectedUserId);
  const repliedMessage = replyToId ? messages.find((m) => m.id === replyToId) : null;
  const replyingToName = repliedMessage?.senderId === user?.id ? "You" : (repliedMessage?.senderName ?? "Unknown");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-4">
      <div className={`w-80 shrink-0 border rounded-lg bg-card overflow-hidden flex flex-col ${isMobile && !showConversations ? "hidden" : ""} ${isMobile ? "w-full" : ""}`}>
        <div className="p-3 border-b font-semibold text-sm bg-muted/30">
          Conversations / المحادثات
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              No conversations yet.
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => {
                  setSelectedUserId(conv.userId);
                  setReplyToId(null);
                  if (isMobile) setShowConversations(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 ${
                  selectedUserId === conv.userId ? "bg-muted/30" : ""
                }`}
              >
                <Avatar className="h-10 w-10 shrink-0">
                  {conv.profileImageUrl && (
                    <AvatarImage src={conv.profileImageUrl} alt={conv.firstName ?? ""} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(conv.firstName, conv.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">
                      {conv.firstName} {conv.lastName}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 border rounded-lg bg-card overflow-hidden flex flex-col ${isMobile && showConversations ? "hidden" : ""}`}>
        {!selectedUserId ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Select a conversation to start chatting
          </div>
        ) : (
          <>
            <div className="p-3 border-b bg-muted/30 flex items-center gap-3">
              {isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setShowConversations(true)} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Avatar className="h-8 w-8">
                {selectedUser?.profileImageUrl && (
                  <AvatarImage src={selectedUser.profileImageUrl} alt={selectedUser?.firstName ?? ""} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                  {getInitials(selectedUser?.firstName ?? null, selectedUser?.lastName ?? null)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {selectedUser?.firstName} {selectedUser?.lastName}
              </span>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isMine = msg.senderId === user?.id;
                  const isEditing = editingId === msg.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"} group`}>
                      <div className={`max-w-[85%] sm:max-w-[70%] ${isMine ? "order-1" : "order-1"}`}>
                        {isEditing ? (
                          <div className="flex gap-2">
                            <Input
                              ref={editInputRef}
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={editKeyDown}
                              className="flex-1"
                              disabled={savingEdit}
                            />
                            <Button size="icon" variant="ghost" onClick={saveEdit} disabled={savingEdit || !editContent.trim()}>
                              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                            </Button>
                            <Button size="icon" variant="ghost" onClick={cancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`px-4 py-2 rounded-2xl text-sm ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            }`}
                          >
                            {msg.isDeleted ? (
                              <p className="italic opacity-60">Message deleted</p>
                            ) : (
                              <>
                                {msg.replyTo && (
                                  <div className={`mb-1.5 pl-2 border-l-2 text-xs ${isMine ? "border-primary-foreground/30 text-primary-foreground/70" : "border-muted-foreground/30 text-muted-foreground/70"}`}>
                                    <span className="font-medium">{msg.replyTo.senderName}</span>
                                    <p className="truncate max-w-60">{msg.replyTo.content}</p>
                                  </div>
                                )}
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                {msg.isEdited && (
                                  <span className={`text-[10px] italic ${isMine ? "text-primary-foreground/50" : "text-muted-foreground/50"}`}>
                                    (edited)
                                  </span>
                                )}
                              </>
                            )}
                            <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        )}
                        {!msg.isDeleted && !isEditing && (
                          <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "justify-end" : "justify-start"}`}>
                            <button
                              onClick={() => setReplyToId(msg.id)}
                              className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              title="Reply"
                            >
                              <Reply className="h-3 w-3" />
                            </button>
                            {isMine && (
                              <>
                                <button
                                  onClick={() => startEdit(msg)}
                                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(msg.id)}
                                  className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {replyToId && repliedMessage && !repliedMessage.isDeleted && (
              <div className="px-3 py-2 border-t flex items-center gap-2 bg-muted/20 text-xs text-muted-foreground">
                <Reply className="h-3 w-3 shrink-0" />
                <span className="truncate flex-1">
                  Replying to <span className="font-medium">{replyingToName}</span>: {repliedMessage.content}
                </span>
                <button onClick={() => setReplyToId(null)} className="shrink-0 hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="p-3 border-t flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1"
                disabled={sending}
              />
              <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will replace the message with "Message deleted". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
