import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Ban, Check, Download, FileWarning, Globe, Laptop, Lock, Network, Play, ServerCrash, Square, User, AppWindow, AlertTriangle } from "lucide-react";
import { qk } from "@/api";
import { KILL_CHAIN, type Incident, type Stage } from "@/data/mock";
import { Skeleton } from "@/components/ui/skeleton";
import { Panel, RiskGauge, SeverityBadge, StatusPill, fmtTime, scoreToSeverity, EmptyState } from "@/components/tl";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/incidents/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} — Incident · ThreatLens` },
      { name: "description", content: `Kill chain, evidence timeline and recommended response for incident ${params.id}.` },
      { property: "og:title", content: `${params.id} — ThreatLens Incident` },
      { property: "og:description", content: "Explainable incident detail with MITRE ATT&CK mapping and raw evidence." },
    ],
  }),
  component: IncidentPage,
});

/** A stage is only renderable when it has a reason AND at least one evidence log. */
function isRenderable(s: Partial<Stage>): s is Stage {
  return Boolean(s.reason && s.reason.trim() && Array.isArray(s.evidence) && s.evidence.length > 0 && s.evidence.every((e) => e.log_id && e.timestamp && e.source));
}

function IncidentPage() {
  const { id } = Route.useParams();
  const { data, isLoading, error } = useQuery(qk.incident(id));

  if (isLoading) return <IncidentSkeleton />;
  if (error || !data)
    return <EmptyState icon={<FileWarning className="size-10" />} title="Incident not found" text={`No incident with ID ${id}.`} />;
  return <IncidentView inc={data} />;
}

function IncidentSkeleton() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <Skeleton className="h-36" />
      <Skeleton className="h-20" />
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-96 lg:col-span-2" /><Skeleton className="h-96" /></div>
    </div>
  );
}

function IncidentView({ inc }: { inc: Incident }) {
  const stages = [...inc.stages].filter(isRenderable).sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const detected = new Set(stages.map((s) => s.stage));
  const [active, setActive] = useState<number | null>(null);
  const [replaying, setReplaying] = useState(false);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (!replaying) return;
    let i = 0;
    setActive(0);
    const t = setInterval(() => {
      i++;
      if (i >= stages.length) {
        clearInterval(t);
        setTimeout(() => { setReplaying(false); setActive(null); }, 1400);
        return;
      }
      setActive(i);
    }, 1400);
    return () => clearInterval(t);
  }, [replaying, stages.length]);

  useEffect(() => {
    if (active !== null) refs.current[active]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [active]);

  const activeStage = active !== null ? stages[active]?.stage : null;

  const exportReport = () => {
    const blob = new Blob([JSON.stringify(inc, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${inc.id}-report.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Report exported: ${inc.id}-report.json`);
  };

  const actions = [
    { label: "Isolate host", icon: ServerCrash, run: () => toast.success(`Host ${inc.entities.hosts[0]} isolated via EDR`) },
    { label: "Block IP", icon: Ban, run: () => toast.success(`IP ${inc.entities.ips[0]} added to block list`) },
    { label: "Disable account", icon: Lock, run: () => toast.success(`Account ${inc.entities.users[0]} disabled, sessions revoked`) },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      {/* Header */}
      <section className="rounded-lg border bg-card p-4 md:p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <RiskGauge score={inc.risk_score} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-primary">{inc.id}</span>
              <SeverityBadge severity={scoreToSeverity(inc.risk_score)} />
              <StatusPill status={inc.status} />
              <span className="text-muted-foreground">Confidence <b className="font-mono text-foreground">{Math.round(inc.confidence * 100)}%</b></span>
            </div>
            <h1 className="mt-1.5 text-lg font-semibold leading-snug md:text-xl">{inc.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{inc.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2 md:max-w-xs md:justify-end">
            {actions.map((a) => (
              <button key={a.label} onClick={a.run} className="inline-flex items-center gap-1.5 rounded-md border border-critical/40 bg-critical/10 px-3 py-1.5 text-xs font-medium text-critical hover:bg-critical/20">
                <a.icon className="size-3.5" /> {a.label}
              </button>
            ))}
            <button onClick={exportReport} className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent">
              <Download className="size-3.5" /> Export report
            </button>
          </div>
        </div>
      </section>

      {/* Kill chain */}
      <section className="rounded-lg border bg-card p-3">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {KILL_CHAIN.map((k, i) => {
            const on = detected.has(k.key);
            const hot = activeStage === k.key;
            return (
              <li key={k.key} className={cn("relative rounded-md border px-3 py-2 transition-all", on ? "border-critical/50 bg-critical/10" : "border-dashed opacity-45", hot && "glow-critical scale-[1.03]")}>
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                  <span className={cn("grid size-4 place-items-center rounded-full text-[9px]", on ? "bg-critical text-destructive-foreground" : "bg-muted")}>{on ? <Check className="size-2.5" /> : i + 1}</span>
                  {k.mitre}
                </div>
                <div className={cn("mt-1 text-xs font-semibold", on ? "text-critical" : "text-muted-foreground")}>{k.label}</div>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Timeline */}
        <Panel
          title="Attack timeline"
          className="lg:col-span-2"
          action={
            <div className="flex items-center gap-2">
              <Link to="/graph/$incidentId" params={{ incidentId: inc.id }} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-accent"><Network className="size-3" /> Graph</Link>
              <button onClick={() => (replaying ? (setReplaying(false), setActive(null)) : setReplaying(true))} className="inline-flex items-center gap-1 rounded bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                {replaying ? <Square className="size-3" /> : <Play className="size-3" />} {replaying ? "Stop" : "Replay attack"}
              </button>
            </div>
          }
        >
          {stages.length === 0 ? (
            <EmptyState icon={<AlertTriangle className="size-8" />} title="No evidenced stages" text="Stages without both a reason and evidence logs are never shown." />
          ) : (
            <ol className="relative space-y-4 border-l border-border pl-6">
              {stages.map((s, i) => (
                <li key={s.id} id={s.id} ref={(el) => { refs.current[i] = el; }} className="relative">
                  <span className={cn("absolute -left-[31px] top-3 grid size-4 place-items-center rounded-full border-2 border-background", active === i ? "bg-primary" : "bg-critical")} />
                  <StageCard stage={s} index={i} active={active === i} dim={active !== null && active !== i} />
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel title="Entities">
            <div className="space-y-3">
              <ChipRow label="Users" icon={User} type="user" items={inc.entities.users} />
              <ChipRow label="Hosts" icon={Laptop} type="host" items={inc.entities.hosts} />
              <ChipRow label="IPs" icon={Globe} type="ip" items={inc.entities.ips} />
              <ChipRow label="Apps" icon={AppWindow} type="app" items={inc.entities.apps} />
            </div>
          </Panel>

          <Panel title="Why flagged?">
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Rule triggered</div>
                <div className="mt-1 rounded border bg-surface p-2 font-mono text-xs">{inc.why_flagged.rule}</div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Anomaly score</span>
                <span className="font-mono text-lg font-semibold text-critical">{inc.why_flagged.anomaly_score.toFixed(2)}</span>
              </div>
              <div>
                <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Feature contribution</div>
                <ul className="space-y-2">
                  {inc.why_flagged.features.map((f) => (
                    <li key={f.name}>
                      <div className="flex justify-between text-xs"><span>{f.name}</span><span className="font-mono text-muted-foreground">{(f.contribution * 100).toFixed(0)}%</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(f.contribution / inc.why_flagged.features[0].contribution) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Recommended actions">
            <ol className="space-y-2">
              {inc.recommendations.map((r, i) => (
                <li key={i} className="flex gap-3 rounded-md border bg-surface p-2.5">
                  <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">{r.action} <span className="font-mono text-xs text-primary">{r.target}</span></div>
                    <div className="text-xs text-muted-foreground">{r.detail}</div>
                  </div>
                  <SeverityBadge severity={r.priority} className="self-start" />
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StageCard({ stage, index, active, dim }: { stage: Stage; index: number; active: boolean; dim: boolean }) {
  if (!isRenderable(stage)) return null;
  return (
    <article className={cn("rounded-lg border bg-surface p-4 transition-all duration-500", active && "glow-primary border-primary", dim && "opacity-40")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
        <span className="font-mono text-xs text-primary">{fmtTime(stage.timestamp)} UTC</span>
        <span className="rounded border border-critical/40 bg-critical/10 px-1.5 py-0.5 text-[11px] font-semibold text-critical">{stage.tactic}</span>
        <span className="font-mono text-[11px] text-muted-foreground">{stage.mitre_tactic_id} · {stage.technique_id} {stage.technique}</span>
      </div>
      <p className="mt-2 text-sm"><span className="font-semibold text-high">Reason: </span>{stage.reason}</p>
      <div className="mt-3 rounded-md border bg-background">
        <div className="border-b px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence · {stage.evidence.length} log{stage.evidence.length > 1 ? "s" : ""}</div>
        <ul className="divide-y">
          {stage.evidence.map((e) => (
            <li key={e.log_id} className="px-3 py-2 font-mono text-[11px]">
              <div className="flex flex-wrap gap-x-3 text-muted-foreground">
                <Link to="/logs" search={{ q: String(e.log_id) }} className="text-primary hover:underline">log#{e.log_id}</Link>
                <span>{fmtTime(e.timestamp)}</span>
                <span>{e.source}</span>
              </div>
              <div className="mt-1 break-all text-foreground/90">{e.raw}</div>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function ChipRow({ label, icon: Icon, type, items }: { label: string; icon: typeof User; type: "user" | "host" | "ip" | "app"; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="mb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <Link key={it} to="/entities/$type/$id" params={{ type, id: it }} className="inline-flex items-center gap-1 rounded-full border bg-surface px-2.5 py-1 font-mono text-xs hover:border-primary hover:text-primary">
            <Icon className="size-3" /> {it}
          </Link>
        ))}
      </div>
    </div>
  );
}
