import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteEntries, deleteEntry, listEntries, type EntryPreview } from "@/services/api";
import { BookOpen, Loader2, Trash2 } from "lucide-react";

const FRAMEWORK_LABELS: Record<string, string> = {
  cbt: "CBT",
  iceberg: "Iceberg",
  growth: "Growth Mindset",
  singapore: "Singaporean Grounded Reframe",
  indonesia: "Indonesian Calm Reframe",
  malaysia: "Malaysian Balanced Reframe",
  thailand: "Thai Gentle Reframe",
  philippines: "Filipino Resilient Reframe",
  vietnam: "Vietnamese Perseverance Reframe",
  brunei: "Bruneian Composed Reframe",
  cambodia: "Cambodian Steady Reframe",
  laos: "Lao Grounded Reframe",
  myanmar: "Myanmar Resilience Reframe",
};

const ENTRY_SUBTITLES_KEY = "mindweave-entry-subtitles";

export function HistoryPage() {
  const [entries, setEntries] = useState<EntryPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [entrySubtitles, setEntrySubtitles] = useState<Record<string, string>>({});

  async function loadEntries() {
    setLoading(true);
    setError("");
    try {
      const result = await listEntries();
      setEntries(result);
    } catch (err: any) {
      setError(err.message || "Failed to fetch entries");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEntries();
    const raw = localStorage.getItem(ENTRY_SUBTITLES_KEY);
    if (!raw) return;
    try {
      setEntrySubtitles(JSON.parse(raw) as Record<string, string>);
    } catch {
      setEntrySubtitles({});
    }
  }, []);

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  }

  function toggleSelectAll() {
    if (selectedIds.length === entries.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(entries.map((entry) => entry.id));
  }

  async function handleDeleteOne(id: string) {
    const confirmed = window.confirm("Delete this entry from Memory Lane?");
    if (!confirmed) return;

    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      await deleteEntry(id);
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setSelectedIds((current) => current.filter((entryId) => entryId !== id));
      setEntrySubtitles((current) => {
        const next = { ...current };
        delete next[id];
        localStorage.setItem(ENTRY_SUBTITLES_KEY, JSON.stringify(next));
        return next;
      });
      setNotice("Entry deleted.");
    } catch (err: any) {
      setError(err.message || "Failed to delete entry");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteSelected() {
    if (selectedIds.length === 0) return;

    const confirmed = window.confirm(`Delete ${selectedIds.length} selected entr${selectedIds.length === 1 ? "y" : "ies"}?`);
    if (!confirmed) return;

    setBulkDeleting(true);
    setError("");
    setNotice("");
    try {
      const result = await deleteEntries(selectedIds);
      setEntries((current) => current.filter((entry) => !selectedIds.includes(entry.id)));
      setEntrySubtitles((current) => {
        const next = { ...current };
        selectedIds.forEach((id) => {
          delete next[id];
        });
        localStorage.setItem(ENTRY_SUBTITLES_KEY, JSON.stringify(next));
        return next;
      });
      setSelectedIds([]);
      setNotice(`${result.deletedCount} entr${result.deletedCount === 1 ? "y" : "ies"} deleted.`);
    } catch (err: any) {
      setError(err.message || "Failed to delete selected entries");
    } finally {
      setBulkDeleting(false);
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

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="rounded-2xl border border-amber-200/80 bg-[linear-gradient(145deg,#fff9ee_0%,#fffef7_45%,#f8f8ef_100%)] p-5 shadow-[0_16px_44px_-30px_rgba(74,53,21,0.45)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800">Memory Lane</h1>
          </div>
          <Badge variant="outline" className="border-amber-300 bg-white/70 text-stone-700">
            {entries.length} entr{entries.length === 1 ? "y" : "ies"}
          </Badge>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        {notice && <p className="mt-3 text-sm text-emerald-800">{notice}</p>}
      </div>

      {entries.length === 0 ? (
        <Card className="border-amber-200/80 bg-white/80">
          <CardContent className="py-12 text-center">
            <p className="text-stone-600">
              No journal entries yet. Start writing to build your Memory Lane.
            </p>
            <Link
              to="/"
              className="mt-2 inline-block text-sm text-amber-700 underline"
            >
              Write your first entry
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/80 bg-white/70 p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs text-stone-700 hover:bg-amber-50"
              >
                {selectedIds.length === entries.length ? "Clear all" : "Select all"}
              </button>
              <span className="text-xs text-stone-600">
                {selectedIds.length} selected
              </span>
            </div>
            <button
              type="button"
              onClick={handleDeleteSelected}
              disabled={selectedIds.length === 0 || bulkDeleting}
              className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {bulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete selected
            </button>
          </div>

          {entries.map((entry) => (
            <Card key={entry.id} className="border-amber-200/80 bg-[repeating-linear-gradient(to_bottom,#fffef9_0px,#fffef9_30px,#ece7dc_31px)] shadow-[0_16px_40px_-30px_rgba(74,53,21,0.35)] transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-28px_rgba(74,53,21,0.45)]">
              <CardContent className="relative py-4 pl-10 pr-4">
                <div className="pointer-events-none absolute inset-y-0 left-7 w-px bg-rose-200/80" />
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-1 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(entry.id)}
                      onChange={() => toggleSelected(entry.id)}
                      aria-label="Select entry"
                      className="mt-1 h-4 w-4 rounded border-amber-300 text-amber-700 focus:ring-amber-600"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.14em] text-amber-700/75">Journal note</p>
                      {entrySubtitles[entry.id] && (
                        <p className="mt-1 text-xs font-medium italic text-stone-600">
                          {entrySubtitles[entry.id]}
                        </p>
                      )}
                      <p className="mt-1 text-sm leading-7 text-stone-700">{entry.preview}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="border-amber-300 bg-white/70 text-xs text-stone-700">
                        {FRAMEWORK_LABELS[entry.framework] || entry.framework}
                      </Badge>
                    </div>
                    <span className="text-xs text-stone-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/memory-lane/${entry.id}`}
                        className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-xs text-stone-700 hover:bg-amber-50"
                      >
                        Open
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDeleteOne(entry.id)}
                        disabled={deletingId === entry.id}
                        className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
