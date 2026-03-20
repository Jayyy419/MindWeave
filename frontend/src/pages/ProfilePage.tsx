import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProfile, type UserProfile } from "@/services/api";
import { Loader2, Trophy, Star, Award, Flame, BookMarked } from "lucide-react";

const BADGE_ICONS: Record<string, React.ReactNode> = {
  "First Entry": <Star className="h-4 w-4" />,
  Consistent: <Flame className="h-4 w-4" />,
  "Deep Diver": <BookMarked className="h-4 w-4" />,
};

const BADGE_DESCRIPTIONS: Record<string, string> = {
  "First Entry": "Wrote your first journal entry",
  Consistent: "Journaled for 7 days in a row",
  "Deep Diver": "Used all three thinking frameworks",
};

const ALL_BADGES = ["First Entry", "Consistent", "Deep Diver"];

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12 text-destructive">
        <p>{error || "Could not load profile"}</p>
      </div>
    );
  }

  const nextLevelEntries = profile.level * 5;
  const progressToNext = ((profile.entryCount % 5) / 5) * 100;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Trophy className="h-6 w-6 text-purple-600" />
        Your Profile
      </h1>

      {/* Level Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Level {profile.level}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{profile.entryCount} entries written</span>
            <span className="text-muted-foreground">
              {nextLevelEntries - profile.entryCount} more to level{" "}
              {profile.level + 1}
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-secondary rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Badges Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="h-5 w-5" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {ALL_BADGES.map((badgeName) => {
              const earned = profile.badges.includes(badgeName);
              return (
                <div
                  key={badgeName}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    earned
                      ? "bg-purple-50 border-purple-200"
                      : "opacity-40 grayscale"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      earned
                        ? "bg-purple-100 text-purple-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {BADGE_ICONS[badgeName]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{badgeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {BADGE_DESCRIPTIONS[badgeName]}
                    </p>
                  </div>
                  {earned && (
                    <Badge className="ml-auto" variant="default">
                      Earned
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tags Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Interest Tags</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Write journal entries to build your interest profile. Tags are
              automatically extracted from your writing.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
