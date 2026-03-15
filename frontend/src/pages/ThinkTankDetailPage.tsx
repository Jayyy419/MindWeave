import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getThinkTank,
  joinThinkTank,
  listThinkTankMessages,
  sendThinkTankMessage,
  type ChatMessage,
  type ThinkTankDetail,
} from "@/services/api";
import { ArrowLeft, Loader2, MessageSquare, Send, Users, UserCircle } from "lucide-react";

export function ThinkTankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tank, setTank] = useState<ThinkTankDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [sending, setSending] = useState(false);

  async function loadTank() {
    if (!id) return;
    try {
      const data = await getThinkTank(id);
      setTank(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTank();
  }, [id]);

  useEffect(() => {
    if (!id || !tank?.isJoined) return;

    let mounted = true;

    const loadMessages = async () => {
      try {
        const nextMessages = await listThinkTankMessages(id);
        if (mounted) setMessages(nextMessages);
      } catch {
        // Avoid noisy errors in polling loop.
      }
    };

    loadMessages();
    const interval = setInterval(loadMessages, 2500);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [id, tank?.isJoined]);

  async function handleJoin() {
    if (!id) return;
    setJoining(true);
    try {
      await joinThinkTank(id);
      await loadTank();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoining(false);
    }
  }

  async function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!id || !chatText.trim()) return;

    setSending(true);
    try {
      await sendThinkTankMessage(id, chatText.trim());
      setChatText("");
      const nextMessages = await listThinkTankMessages(id);
      setMessages(nextMessages);
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tank) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || "Think tank not found"}</p>
        <Link
          to="/thinktanks"
          className="text-primary underline text-sm mt-2 inline-block"
        >
          Back to Think Tanks
        </Link>
      </div>
    );
  }

  const isFull = tank.members.length >= tank.maxMembers;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link to="/thinktanks">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Think Tanks
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-600" />
            <CardTitle>{tank.name}</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">{tank.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {tank.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Join button */}
          {!tank.isJoined && !isFull && (
            <Button onClick={handleJoin} disabled={joining}>
              {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Join this Think Tank
            </Button>
          )}
          {tank.isJoined && (
            <p className="text-sm text-green-600 font-medium">
              You are a member of this think tank
            </p>
          )}
          {isFull && !tank.isJoined && (
            <p className="text-sm text-muted-foreground">
              This think tank is full ({tank.maxMembers}/{tank.maxMembers})
            </p>
          )}
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Members ({tank.members.length}/{tank.maxMembers})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tank.members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No members yet. Be the first to join!
            </p>
          ) : (
            <div className="space-y-3">
              {tank.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <UserCircle className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      @{member.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {member.level} · Joined{" "}
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tank.isJoined && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-purple-600" />
              Group Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation with your group.
                </p>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`rounded-md px-3 py-2 ${
                      message.role === "bot"
                        ? "border border-purple-200 bg-purple-50"
                        : "border bg-white"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-semibold ${
                          message.role === "bot" ? "text-purple-700" : "text-foreground"
                        }`}
                      >
                        {message.usernameSnapshot}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="Share an update... use /ask for AI bot help"
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                maxLength={1000}
                disabled={sending}
              />
              <Button type="submit" disabled={sending || !chatText.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
