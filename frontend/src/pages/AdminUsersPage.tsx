import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/context/UserContext";
import { listAdminUsers, updateAdminUserRole, type AdminUserRecord } from "@/services/api";
import { Loader2, Search, Shield, ShieldOff, UsersRound } from "lucide-react";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AdminUsersPage() {
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);

  async function loadUsers(nextQuery = appliedQuery) {
    const response = await listAdminUsers(nextQuery);
    setUsers(response.users);
  }

  useEffect(() => {
    loadUsers("")
      .catch((err: Error) => setError(err.message || "Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(event?: React.FormEvent) {
    event?.preventDefault();
    setSearching(true);
    setError("");
    setSuccess("");
    try {
      const nextQuery = query.trim();
      setAppliedQuery(nextQuery);
      await loadUsers(nextQuery);
    } catch (err: any) {
      setError(err.message || "Failed to search users");
    } finally {
      setSearching(false);
    }
  }

  async function handleToggleAdmin(targetUser: AdminUserRecord) {
    setSavingUserId(targetUser.id);
    setError("");
    setSuccess("");

    try {
      const response = await updateAdminUserRole(targetUser.id, !targetUser.isAdmin);
      setUsers((current) =>
        current.map((item) => (item.id === targetUser.id ? response.user : item))
      );
      setSuccess(response.message);
    } catch (err: any) {
      setError(err.message || "Failed to update admin access");
    } finally {
      setSavingUserId(null);
    }
  }

  const stats = useMemo(() => {
    const adminCount = users.filter((item) => item.isAdmin).length;
    return {
      total: users.length,
      admins: adminCount,
      members: Math.max(users.length - adminCount, 0),
    };
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl border border-violet-200/80 bg-[linear-gradient(145deg,#fbf5ff_0%,#ffffff_45%,#f5fbff_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(91,33,182,0.28)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-violet-700" />
              <h1 className="text-2xl font-bold text-stone-800">User Management</h1>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
              Promote trusted teammates to admin access, review account ownership, and keep operational tools restricted.
            </p>
          </div>
          <div className="rounded-xl border border-violet-200 bg-white/80 px-4 py-3 text-sm text-stone-700">
            <p>
              Signed in as: <span className="font-semibold text-stone-900">@{user?.username}</span>
            </p>
            <p>
              Admin accounts shown: <span className="font-semibold text-stone-900">{stats.admins}</span>
            </p>
          </div>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{success}</div> : null}

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border-violet-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Loaded Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-stone-900">{stats.total}</p>
            <p className="mt-1 text-sm text-stone-600">Current search result set</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-stone-900">{stats.admins}</p>
            <p className="mt-1 text-sm text-stone-600">Accounts with elevated access</p>
          </CardContent>
        </Card>
        <Card className="border-sky-200/80 bg-white/90 shadow-none">
          <CardHeader>
            <CardTitle className="text-base text-stone-800">Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-stone-900">{stats.members}</p>
            <p className="mt-1 text-sm text-stone-600">Standard user accounts</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200/80 bg-white/90 shadow-none">
        <CardHeader>
          <CardTitle className="text-base text-stone-800">Find Users</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by email or username"
                className="w-full rounded-lg border border-stone-200 bg-white py-2.5 pl-9 pr-3 text-sm text-stone-800"
              />
            </div>
            <Button type="submit" disabled={searching} className="bg-violet-700 text-white hover:bg-violet-800">
              {searching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setQuery("");
                setAppliedQuery("");
                setSearching(true);
                setError("");
                setSuccess("");
                loadUsers("")
                  .catch((err: Error) => setError(err.message || "Failed to load users"))
                  .finally(() => setSearching(false));
              }}
              disabled={searching && !appliedQuery}
            >
              Clear
            </Button>
          </form>
          {appliedQuery ? (
            <p className="mt-3 text-sm text-stone-600">
              Filtering results for <span className="font-medium text-stone-900">{appliedQuery}</span>
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {users.length === 0 ? (
          <Card className="border-stone-200/80 bg-white/90 shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <UsersRound className="h-8 w-8 text-stone-400" />
              <div>
                <p className="font-medium text-stone-900">No users found</p>
                <p className="text-sm text-stone-600">Try a different email or username search.</p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {users.map((member) => {
          const isSelf = member.id === user?.id;
          const buttonLabel = member.isAdmin ? "Remove admin" : "Make admin";

          return (
            <Card key={member.id} className="border-stone-200/80 bg-white/90 shadow-none">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-stone-900">
                      {member.username ? `@${member.username}` : "Unnamed account"}
                    </p>
                    <Badge variant={member.isAdmin ? "default" : "secondary"} className={member.isAdmin ? "bg-violet-700 text-white" : ""}>
                      {member.isAdmin ? "Admin" : "Member"}
                    </Badge>
                    {isSelf ? (
                      <Badge variant="outline" className="border-stone-300 text-stone-700">
                        You
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-stone-700">{member.email || "No email on file"}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.08em] text-stone-500">
                    <span>Level {member.level}</span>
                    <span>{member.entryCount} entries</span>
                    <span>Joined {formatDate(member.createdAt)}</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleToggleAdmin(member)}
                  disabled={savingUserId === member.id || isSelf}
                  variant={member.isAdmin ? "outline" : "default"}
                  className={member.isAdmin ? "border-violet-200 text-violet-800 hover:bg-violet-50" : "bg-violet-700 text-white hover:bg-violet-800"}
                >
                  {savingUserId === member.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : member.isAdmin ? <ShieldOff className="mr-1 h-4 w-4" /> : <Shield className="mr-1 h-4 w-4" />}
                  {isSelf ? "Current admin" : buttonLabel}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}