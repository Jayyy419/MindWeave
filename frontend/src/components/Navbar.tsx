import { Link, useLocation } from "react-router-dom";
import { BookOpen, User, Users, PenLine } from "lucide-react";

const navItems = [
  { to: "/", label: "Journal", icon: PenLine },
  { to: "/history", label: "History", icon: BookOpen },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/thinktanks", label: "Think Tanks", icon: Users },
];

export function Navbar() {
  const location = useLocation();

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
          {navItems.map(({ to, label, icon: Icon }) => {
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
      </div>
    </header>
  );
}
