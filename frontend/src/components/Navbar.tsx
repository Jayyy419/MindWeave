import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BookOpen, BookText, BriefcaseBusiness, ChevronDown, LineChart, PenLine, Settings, Shield, User, Users, Compass } from "lucide-react";
import { useUser } from "@/context/UserContext";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/", label: "Journal", icon: PenLine },
  { to: "/memory-lane", label: "Memory Lane", icon: BookOpen },
  { to: "/thinktanks", label: "Think Tanks", icon: Users },
  { to: "/learning-library", label: "Learning Library", icon: BookText },
    { to: "/surveys", label: "Surveys", icon: Compass },
  { to: "/impact-hub", label: "Impact Hub", icon: LineChart },
  { to: "/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
];

export function Navbar() {
  const location = useLocation();
  const { user, logout } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const visibleNavItems = navItems.filter(
    (item) => item.to !== "/impact-hub" || user?.isAdmin === true
  );

  const initials = useMemo(() => {
    if (!user?.username) return "MW";
    const pieces = user.username.trim().split(/\s+/).filter(Boolean);
    if (pieces.length === 1) {
      return pieces[0].slice(0, 2).toUpperCase();
    }
    return `${pieces[0][0]}${pieces[1][0]}`.toUpperCase();
  }, [user?.username]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEsc(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo / Brand */}
        <Link to="/" className="mr-6 flex items-center space-x-2">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            MindWeave
          </span>
        </Link>

        {/* Navigation links */}
        <nav className="flex items-center space-x-1">
          {visibleNavItems.map(({ to, label, icon: Icon }) => {
            const isActive =
              to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm hover:bg-accent"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-sky-500 text-xs font-semibold text-white">
                {initials}
              </span>
              <span className="hidden sm:inline text-foreground">@{user?.username}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-border bg-background p-1 shadow-lg">
                <Link
                  to="/profile"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => setMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
                {user?.isAdmin ? (
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-accent"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4" />
                    User Management
                  </Link>
                ) : null}
              </div>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
