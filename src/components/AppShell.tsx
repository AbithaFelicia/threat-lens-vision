import { useState, type ReactNode, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Activity, BarChart3, LayoutDashboard, Menu, Network, ScrollText, Search, ShieldAlert, X } from "lucide-react";
import { useDemoMode } from "@/lib/demo";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incidents/$id", params: { id: "INC-001" }, label: "Incidents", icon: ShieldAlert },
  { to: "/graph/$incidentId", params: { incidentId: "INC-001" }, label: "Attack Graph", icon: Network },
  { to: "/logs", label: "Log Explorer", icon: ScrollText },
  { to: "/entities/$type/$id", params: { type: "user", id: "alice" }, label: "Entities", icon: Activity },
  { to: "/metrics", label: "Metrics", icon: BarChart3 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { mode, setMode } = useDemoMode();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    navigate({ to: "/logs", search: { q: q.trim() || undefined } });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border bg-sidebar transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <div className="grid size-7 place-items-center rounded-md bg-primary/15 text-primary glow-primary">
            <ShieldAlert className="size-4" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">ThreatLens</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">CTI · SOC</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-4" /></button>
        </div>
        <nav className="space-y-0.5 p-2">
          {NAV.map((n) => (
            <Link
              key={n.label}
              to={n.to}
              {...("params" in n ? { params: n.params as never } : {})}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: n.to === "/", includeSearch: false }}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent text-primary" }}
            >
              <n.icon className="size-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute inset-x-0 bottom-0 border-t border-sidebar-border p-4 font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5"><span className="size-1.5 animate-pulse rounded-full bg-low" /> Sensors online · 42</div>
          <div className="mt-1">Model v3.2 · ensemble</div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-background/70 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <form onSubmit={submit} className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search logs, users, hosts, IPs…"
              className="h-9 w-full rounded-md border bg-surface pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground md:inline">Demo mode</span>
            <div className="flex rounded-md border bg-surface p-0.5 text-xs" role="group" aria-label="Demo mode">
              <button onClick={() => setMode("attack")} className={cn("rounded px-2.5 py-1 font-medium transition-colors", mode === "attack" ? "bg-critical/20 text-critical" : "text-muted-foreground")}>
                Attack data
              </button>
              <button onClick={() => setMode("clean")} className={cn("rounded px-2.5 py-1 font-medium transition-colors", mode === "clean" ? "bg-low/20 text-low" : "text-muted-foreground")}>
                Clean <span className="hidden sm:inline">(benign)</span>
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
