import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  listAvailableThinkTanks,
  listThinkTanks,
  joinThinkTank,
  type ThinkTankPreview,
} from "@/services/api";
import { Loader2, Users, Lock, CheckCircle, Sparkles, ArrowRight } from "lucide-react";

export function ThinkTanksPage() {
  const [allTanks, setAllTanks] = useState<ThinkTankPreview[]>([]);
  const [availableTanks, setAvailableTanks] = useState<ThinkTankPreview[]>([]);
  const [matchMessage, setMatchMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  async function loadData() {
    try {
      const [allData, availableData] = await Promise.all([
        listThinkTanks(),
        listAvailableThinkTanks(),
      ]);
      setAllTanks(allData);
      setAvailableTanks(availableData.available);
      if (availableData.message) setMatchMessage(availableData.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleJoin(tankId: string) {
    setJoiningId(tankId);
    try {
      await joinThinkTank(tankId);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setJoiningId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  // Determine which tank IDs are available for this user
  const availableIds = new Set(availableTanks.map((t) => t.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,#fff9ee_0%,#fffef7_45%,#f8f8ef_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(74,53,21,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="h-6 w-6 text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800">Think Tanks</h1>
          </div>
          <Badge variant="outline" className="border-amber-300 bg-white/70 text-stone-700">
            {allTanks.length} group{allTanks.length === 1 ? "" : "s"}
          </Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Small, focused peer spaces for reflective growth. Write at least 3 journal entries to unlock matching based on your themes.
        </p>
      </div>

      {matchMessage && (
        <Card className="border-amber-200/80 bg-amber-50/70 shadow-none">
          <CardContent className="py-3">
            <p className="flex items-center gap-2 text-sm text-amber-900">
              <Lock className="h-4 w-4" />
              {matchMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {availableTanks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-700" />
            <h2 className="text-lg font-semibold text-stone-800">Matched for You</h2>
            <Badge variant="outline" className="border-amber-300 bg-white/70 text-xs text-stone-700">
              {availableTanks.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {availableTanks.map((tank) => (
              <ThinkTankCard
                key={tank.id}
                tank={tank}
                isAvailable
                joiningId={joiningId}
                onJoin={handleJoin}
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-stone-800">All Think Tanks</h2>
          <Badge variant="outline" className="border-amber-300 bg-white/70 text-xs text-stone-700">
            {allTanks.length}
          </Badge>
        </div>
        <div className="space-y-4">
          {allTanks.map((tank) => (
            <ThinkTankCard
              key={tank.id}
              tank={tank}
              isAvailable={availableIds.has(tank.id)}
              joiningId={joiningId}
              onJoin={handleJoin}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function ThinkTankCard({
  tank,
  isAvailable,
  joiningId,
  onJoin,
}: {
  tank: ThinkTankPreview;
  isAvailable: boolean;
  joiningId: string | null;
  onJoin: (id: string) => void;
}) {
  return (
    <Link to={`/thinktanks/${tank.id}`}>
      <Card
        className={`border-amber-200/80 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] shadow-[0_16px_40px_-30px_rgba(74,53,21,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-28px_rgba(74,53,21,0.45)] ${
          isAvailable ? "ring-1 ring-amber-300/70" : ""
        }`}
      >
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-stone-800">{tank.name}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-stone-600">{tank.description}</p>
            </div>
            <span className="whitespace-nowrap rounded-md border border-amber-300 bg-white/80 px-2 py-1 text-xs text-stone-700">
              {tank.memberCount}/{tank.maxMembers} members
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {tank.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="border-amber-300 bg-white/70 text-xs text-stone-700">
                  {tag}
                </Badge>
              ))}
            </div>
            <ArrowRight className="mt-0.5 h-4 w-4 text-amber-700/70" />
          </div>

          {isAvailable && !tank.isJoined && !tank.isFull && (
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                onJoin(tank.id);
              }}
              className="bg-emerald-700 text-emerald-50 hover:bg-emerald-800"
              disabled={joiningId === tank.id}
            >
              {joiningId === tank.id ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Join Think Tank
            </Button>
          )}
          {tank.isJoined && (
            <div className="flex items-center gap-1 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Joined
            </div>
          )}
          {tank.isFull && !tank.isJoined && (
            <p className="text-sm text-stone-500">This tank is full</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
