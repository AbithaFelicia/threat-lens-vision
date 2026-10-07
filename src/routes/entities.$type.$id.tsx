import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, AppWindow, CheckCircle2, Globe, Laptop, User } from "lucide-react";
import { qk } from "@/api";
import { incidents, type EntityType } from "@/data/mock";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, Panel, RiskGauge, SeverityBadge, StatusPill, scoreToSeverity } from "@/components/tl";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/entities/$type/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} (${params.type}) — Entity · ThreatLens` },
      { name: "description", content: `Baseline vs observed behaviour and anomaly trend for ${params.type} ${params.id}.` },
      { property: "og:title", content: `${params.id} — ThreatLens Entity` },
      { property: "og:description", content: "Entity behaviour profile with anomaly scoring." },
    ],
  }),
  component: EntityPage,
});

const ICON = { user: User, host: Laptop, ip: Globe, app: AppWindow };

function EntityPage() {
  const { type, id } = Route.useParams();
  const t = (["user", "host", "ip", "app"].includes(type) ? type : "user") as EntityType;
  const { data, isLoading } = useQuery(qk.entity(t, id));
  const Icon = ICON[t];

  if (isLoading || !data)
    return (
      <div className="mx-auto max-w-[1500px] space-y-4">
        <Skeleton className="h-28" />
        <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </div>
    );

  const related = incidents.filter((i) => data.related_incidents.includes(i.id));
  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <section className="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center">
        <span className={cn("grid size-14 place-items-center rounded-lg", related.length ? "bg-critical/15 text-critical" : "bg-muted text-muted-foreground")}><Icon className="size-7" /></span>
        <div className="flex-1">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t} entity</div>
          <h1 className="font-mono text-2xl font-semibold">{data.display}</h1>
          <div className="mt-1 text-xs text-muted-foreground">{data.baseline.filter((b) => b.anomalous).length} of {data.baseline.length} behaviours deviate from baseline</div>
        </div>
        <RiskGauge score={data.risk} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Baseline vs observed">
          <div className="-m-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-2 font-medium">Behaviour</th><th className="px-2 py-2 font-medium">Baseline</th><th className="px-2 py-2 font-medium">Observed</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody>
                {data.baseline.map((b) => (
                  <tr key={b.label} className="border-b last:border-0">
                    <td className="px-4 py-2.5 text-muted-foreground">{b.label}</td>
                    <td className="px-2 py-2.5 font-mono text-xs">{b.usual}</td>
                    <td className={cn("px-2 py-2.5 font-mono text-xs", b.anomalous && "font-semibold text-critical")}>{b.observed}</td>
                    <td className="px-4 py-2.5">{b.anomalous ? <AlertTriangle className="size-4 text-critical" /> : <CheckCircle2 className="size-4 text-low" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Anomaly score over time">
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={data.anomaly_series} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 1]} stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <ReferenceLine y={0.7} stroke="var(--critical)" strokeDasharray="4 4" label={{ value: "alert threshold", fill: "var(--critical)", fontSize: 10, position: "insideTopLeft" }} />
                <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title={`Related incidents (${related.length})`}>
        {related.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="size-8 text-low" />} title="No incidents" text="This entity isn't part of any correlated incident." />
        ) : (
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {related.map((i) => (
              <li key={i.id}>
                <Link to="/incidents/$id" params={{ id: i.id }} className="block rounded-md border bg-surface p-3 hover:border-primary">
                  <div className="flex items-center gap-2"><span className="font-mono text-xs text-primary">{i.id}</span><SeverityBadge severity={scoreToSeverity(i.risk_score)}>{i.risk_score}</SeverityBadge><StatusPill status={i.status} /></div>
                  <div className="mt-1.5 text-sm font-medium">{i.title}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
