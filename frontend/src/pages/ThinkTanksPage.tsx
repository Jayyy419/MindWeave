import { useEffect, useMemo, useState } from "react";
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
import { ArrowRight, CheckCircle, Loader2, Lock, Sparkles, Users, X } from "lucide-react";

export function ThinkTanksPage() {
  const [allTanks, setAllTanks] = useState<ThinkTankPreview[]>([]);
  const [availableTanks, setAvailableTanks] = useState<ThinkTankPreview[]>([]);
  const [unlockMessage, setUnlockMessage] = useState(
    "Continue using your journal consistently to reveal and unlock Think Tanks."
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [isHiddenTankModalOpen, setIsHiddenTankModalOpen] = useState(false);

  async function loadData() {
    try {
      const [allData, availableData] = await Promise.all([
        listThinkTanks(),
        listAvailableThinkTanks(),
      ]);
      setAllTanks(allData);
      setAvailableTanks(availableData.available);
      setUnlockMessage(
        availableData.message ||
          "Keep journaling to unlock more Think Tanks and reveal better-fitting spaces."
      );
    } catch (err: any) {
      setError(err.message || "Failed to load think tanks");
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

  const unlockedIds = useMemo(
    () => new Set(availableTanks.map((tank) => tank.id)),
    [availableTanks]
  );

  const joinedTanks = allTanks.filter((tank) => tank.isJoined);
  const hiddenTanks = allTanks.filter((tank) => !tank.isJoined);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
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
          Think Tanks unlock over time through authentic reflection signals. Specific groups stay hidden until your journaling activity reveals a stronger fit.
        </p>
      </div>

      <div className="rounded-2xl border border-indigo-200/80 bg-[linear-gradient(145deg,#eef4ff_0%,#f8fbff_52%,#f2f4ff_100%)] p-5 shadow-[0_18px_40px_-30px_rgba(56,88,167,0.45)]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Keep journaling to unlock Think Tanks</h2>
            <p className="mt-1 text-sm leading-6 text-stone-700">{unlockMessage}</p>
          </div>
        </div>
        <p className="mt-3 text-xs uppercase tracking-[0.14em] text-indigo-700/75">
          Write more entries, build your reflection profile, and hidden communities will reveal themselves automatically.
        </p>
      </div>

      {joinedTanks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-700" />
            <h2 className="text-lg font-semibold text-stone-800">Your Think Tanks</h2>
            <Badge variant="outline" className="border-amber-300 bg-white/70 text-xs text-stone-700">
              {joinedTanks.length}
            </Badge>
          </div>
          <div className="space-y-4">
            {joinedTanks.map((tank) => (
              <UnlockedTankCard
                key={tank.id}
                tank={tank}
                joiningId={joiningId}
                onJoin={handleJoin}
              />
            ))}
          </div>
        </section>
      )}

      {hiddenTanks.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-stone-600" />
            <h2 className="text-lg font-semibold text-stone-800">Sneak Peek</h2>
            <Badge variant="outline" className="border-stone-300 bg-white/70 text-xs text-stone-700">
              {hiddenTanks.length}
            </Badge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {hiddenTanks.map((tank, index) => (
              <LockedTankCard
                key={tank.id}
                tank={tank}
                index={index}
                isAvailable={unlockedIds.has(tank.id)}
                onLockedClick={() => setIsHiddenTankModalOpen(true)}
              />
            ))}
          </div>
        </section>
      )}

      {isHiddenTankModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
          onClick={() => setIsHiddenTankModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-amber-200 bg-[linear-gradient(160deg,#fff9ec_0%,#fffef7_45%,#f8f8ef_100%)] p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-stone-800">This Think Tank Is Hidden</h3>
              <button
                type="button"
                onClick={() => setIsHiddenTankModalOpen(false)}
                className="inline-flex items-center rounded-md border border-amber-200 bg-white px-2 py-1 text-sm text-stone-600 hover:bg-amber-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm leading-6 text-stone-700">
              This group is currently unavailable for your account. Unlock criteria are intentionally hidden to preserve authentic journaling behavior and fair access to future opportunities.
            </p>
            <p className="mt-3 text-xs text-stone-500">
              Continue journaling normally. Eligible groups will unlock automatically.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function UnlockedTankCard({
  tank,
  joiningId,
  onJoin,
}: {
  tank: ThinkTankPreview;
  joiningId: string | null;
  onJoin: (id: string) => void;
}) {
  return (
    <Link to={`/thinktanks/${tank.id}`}>
      <Card className="border-amber-200/80 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] shadow-[0_16px_40px_-30px_rgba(74,53,21,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-28px_rgba(74,53,21,0.45)] ring-1 ring-amber-300/70">
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

          {!tank.isJoined && !tank.isFull && (
            <Button
              size="sm"
              onClick={(event) => {
                event.preventDefault();
                onJoin(tank.id);
              }}
              className="bg-emerald-700 text-emerald-50 hover:bg-emerald-800"
              disabled={joiningId === tank.id}
            >
              {joiningId === tank.id ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
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

function LockedTankCard({
  tank,
  index,
  isAvailable,
  onLockedClick,
}: {
  tank: ThinkTankPreview;
  index: number;
  isAvailable: boolean;
  onLockedClick: () => void;
}) {
  const teaserLines = [
    "A small circle matched to your reflection patterns.",
    "Hidden until your journaling rhythm reveals a stronger fit.",
    "Keep writing to surface the communities meant for you.",
  ];

  return (
    <button type="button" onClick={onLockedClick} className="block w-full text-left">
      <Card className="border-stone-200/90 bg-[repeating-linear-gradient(to_bottom,#faf9f4_0px,#faf9f4_30px,#e7e3d9_31px)] opacity-90 shadow-[0_12px_32px_-28px_rgba(70,70,70,0.45)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(70,70,70,0.5)]">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-stone-700">Hidden Think Tank {String(index + 1).padStart(2, "0")}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-stone-500">
                {teaserLines[index % teaserLines.length]}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-md border border-stone-300 bg-white/80 px-2 py-1 text-xs text-stone-600">
              <Lock className="h-3.5 w-3.5" />
              {isAvailable ? "Still hidden" : "Locked"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-stone-300 bg-white/70 text-xs text-stone-500">
              Journaling unlock
            </Badge>
            <Badge variant="outline" className="border-stone-300 bg-white/70 text-xs text-stone-500">
              Details concealed
            </Badge>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
