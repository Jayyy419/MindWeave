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
import { Loader2, Users, Lock, CheckCircle } from "lucide-react";

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-purple-600" />
        <h1 className="text-2xl font-bold">Think Tanks</h1>
      </div>

      <p className="text-muted-foreground text-sm">
        Think tanks are small groups of like-minded individuals. Write at least 3
        journal entries to unlock matching based on your interests.
      </p>

      {matchMessage && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="py-3">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {matchMessage}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Available Think Tanks (matched to user) */}
      {availableTanks.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-purple-700">
            Matched for You
          </h2>
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
      )}

      {/* All Think Tanks */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">All Think Tanks</h2>
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
        className={`hover:shadow-md transition-shadow ${
          isAvailable ? "border-purple-200" : ""
        }`}
      >
        <CardContent className="py-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{tank.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {tank.description}
              </p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {tank.memberCount}/{tank.maxMembers} members
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {tank.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          {isAvailable && !tank.isJoined && !tank.isFull && (
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                onJoin(tank.id);
              }}
              disabled={joiningId === tank.id}
            >
              {joiningId === tank.id ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : null}
              Join Think Tank
            </Button>
          )}
          {tank.isJoined && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              Joined
            </div>
          )}
          {tank.isFull && !tank.isJoined && (
            <p className="text-sm text-muted-foreground">This tank is full</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
