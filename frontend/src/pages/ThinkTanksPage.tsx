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
import { ArrowRight, CheckCircle, Loader2, Sparkles, Users } from "lucide-react";

export function ThinkTanksPage() {
  const [allTanks, setAllTanks] = useState<ThinkTankPreview[]>([]);
  const [unlockMessage, setUnlockMessage] = useState(
    "Continue using your journal consistently to reveal and unlock Think Tanks."
  );
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

  const joinedTanks = allTanks.filter((tank) => tank.isJoined);

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
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800">Think Tanks</h1>
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Think Tanks are curated circles inside MindWeave where users with shared patterns, interests, and goals can be matched into higher-context opportunities. They stay locked until your journaling history is strong enough to signal a real fit.
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

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="border-amber-200/80 bg-white/80 shadow-[0_12px_32px_-28px_rgba(74,53,21,0.25)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-stone-800">What Think Tanks are</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-stone-700">
            <p>
              Think Tanks are not just chat groups. They are curated communities built from reflection patterns, lived interests, writing themes, and long-term intent that appear across your journal entries.
            </p>
            <p>
              The goal is to place you in circles that feel genuinely aligned, so the people, conversations, resources, and opportunities inside each Think Tank are more relevant than a random interest tag match.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-white/80 shadow-[0_12px_32px_-28px_rgba(74,53,21,0.25)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-stone-800">How unlocking works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-stone-700">
            <p>
              Access is unlocked through consistent journaling, not by filling in a form or chasing visible requirements. MindWeave looks for repeated signals in your reflections over time before it reveals a fit.
            </p>
            <p>
              This keeps the system harder to game and helps ensure that unlocked Think Tanks reflect who you actually are thinking, building, and growing into.
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200/80 bg-white/80 shadow-[0_12px_32px_-28px_rgba(74,53,21,0.25)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-stone-800">Competitions and resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-6 text-stone-700">
            <p>
              Some Think Tanks can become pathways to competitions, mentorship, learning resources, or outreach from organisers who want to support people with the right fit for a challenge or program.
            </p>
            <p>
              If a user joins a connected competition or opportunity, organisers may request a MindWeave profile package to understand that participant better. That package should only be shared with clear user consent and can include relevant interests, reflection patterns, and selected journal context tied to the opportunity.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card className="border-amber-200/80 bg-[linear-gradient(145deg,#fffaf0_0%,#fffef8_55%,#f7f5ee_100%)] shadow-[0_16px_36px_-28px_rgba(74,53,21,0.3)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-stone-800">Important privacy note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm leading-6 text-stone-700">
          <p>
            Unlocking a Think Tank does not automatically give organisers or third parties access to your private writing. Unlocking only reveals that you may be a fit for certain communities or opportunities.
          </p>
          <p>
            Any deeper sharing of journal-derived signals, interests, or participant context should happen through an explicit opt-in step from the user, especially when linked to competitions, external organisers, or additional resources.
          </p>
          <div className="pt-2">
            <Link to="/opportunities">
              <Button size="sm" className="bg-indigo-700 text-indigo-50 hover:bg-indigo-800">
                Review opportunities and consent requests
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
