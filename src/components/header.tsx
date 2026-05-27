"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { AlertTriangle, Bell, Dumbbell, Heart, Plus, Search, ShoppingBag, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { data: session, status } = useSession();
  const [unread, setUnread] = useState(0);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const r = await fetch("/api/notifications?unreadOnly=1", { cache: "no-store" });
        if (!r.ok || cancelled) return;
        const d = await r.json();
        setUnread(d.notifications?.length ?? 0);
      } catch {}
    };
    fetchUnread();
    const i = setInterval(fetchUnread, 15000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, [status]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    window.location.href = q ? `/?q=${encodeURIComponent(q)}` : "/";
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="hidden sm:inline">EliteBids</span>
        </Link>

        <form onSubmit={onSearch} className="flex flex-1 max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search listings..."
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" size="sm" className="hidden sm:inline-flex">
            Search
          </Button>
        </form>

        <nav className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="FitSpot — activities marketplace"
            title="FitSpot"
          >
            <Link href="/marketplace">
              <Dumbbell className="h-5 w-5 text-emerald-600" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Emergency app" title="Emergency">
            <Link href="/emergency">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </Link>
          </Button>
          {status === "authenticated" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sell" className="flex items-center gap-1">
                  <Plus className="h-4 w-4" /> <span className="hidden md:inline">Sell</span>
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Watchlist">
                <Link href="/watchlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Link href="/notifications">
                  <Bell className="h-5 w-5" />
                  {unread > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 min-w-[20px] justify-center px-1 text-[10px]"
                    >
                      {unread}
                    </Badge>
                  )}
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon" aria-label="Account">
                <Link href="/account">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })}>
                Sign out
              </Button>
            </>
          ) : status === "loading" ? null : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
