// Mock API layer. Each function mirrors a REST endpoint; replace bodies with fetch() calls later.
import { queryOptions } from "@tanstack/react-query";
import {
  alertsOverTime,
  buildEntity,
  graphs,
  incidents,
  logs,
  metrics,
  type EntityType,
  type LogRow,
} from "@/data/mock";

export type DemoMode = "attack" | "clean";
const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));
let uploaded: LogRow[] = [];

// GET /incidents
export async function getIncidents(mode: DemoMode) {
  await delay();
  if (mode === "clean") return [];
  return [...incidents].sort((a, b) => b.risk_score - a.risk_score);
}
// GET /incidents/{id}
export async function getIncident(id: string) {
  await delay();
  const inc = incidents.find((i) => i.id === id);
  if (!inc) throw new Error(`Incident ${id} not found`);
  return inc;
}
// GET /graph/{incident_id}
export async function getGraph(incidentId: string) {
  await delay();
  const g = graphs.find((x) => x.incident_id === incidentId);
  if (!g) throw new Error(`No graph for ${incidentId}`);
  return g;
}
// GET /logs?user=&ip=&from=&to=
export async function getLogs(mode: DemoMode, q: { user?: string; ip?: string; from?: string; to?: string } = {}) {
  await delay(300);
  let rows = [...uploaded, ...logs];
  if (mode === "clean") rows = rows.filter((l) => !l.incident_id);
  if (q.user) rows = rows.filter((l) => l.user === q.user);
  if (q.ip) rows = rows.filter((l) => l.ip === q.ip);
  if (q.from) rows = rows.filter((l) => l.timestamp >= q.from!);
  if (q.to) rows = rows.filter((l) => l.timestamp <= q.to!);
  return rows;
}
// GET /entities/{type}/{id}
export async function getEntity(type: EntityType, id: string) {
  await delay();
  return buildEntity(type, id);
}
// GET /metrics
export async function getMetrics(mode: DemoMode) {
  await delay();
  const { tp, fp, fn, tn } = metrics.confusion;
  const precision = tp / (tp + fp);
  const recall = tp / (tp + fn);
  const clean = mode === "clean";
  return {
    ...metrics,
    precision,
    recall,
    f1: (2 * precision * recall) / (precision + recall),
    fpr: fp / (fp + tn),
    logs_ingested: metrics.logs_ingested + uploaded.length,
    alerts_raised: clean ? 0 : alertsOverTime.reduce((a, b) => a + b.alerts, 0),
    attacks_detected: clean ? 0 : incidents.length,
    alerts_over_time: clean ? alertsOverTime.map((d) => ({ ...d, alerts: 0, attacks: 0 })) : alertsOverTime,
    severity_dist: clean
      ? []
      : [
          { name: "Critical", key: "critical", value: 1 },
          { name: "High", key: "high", value: 4 },
          { name: "Medium", key: "medium", value: 9 },
          { name: "Low", key: "low", value: 17 },
        ],
  };
}
// POST /upload
export async function uploadLogs(rows: Partial<LogRow>[]) {
  await delay(500);
  const base = Date.now() % 100000 + 50000;
  const parsed: LogRow[] = rows.map((r, i) => ({
    id: Number(r.id) || base + i,
    timestamp: String(r.timestamp ?? new Date().toISOString()),
    user: String(r.user ?? "unknown"),
    host: String(r.host ?? "unknown"),
    ip: String(r.ip ?? "0.0.0.0"),
    event_type: String(r.event_type ?? "upload"),
    severity: (["critical", "high", "medium", "low", "info"].includes(String(r.severity)) ? r.severity : "info") as LogRow["severity"],
    source: String(r.source ?? "Upload"),
    message: String(r.message ?? JSON.stringify(r)),
  }));
  uploaded = [...parsed, ...uploaded];
  return { inserted: parsed.length };
}

export const qk = {
  incidents: (mode: DemoMode) => queryOptions({ queryKey: ["incidents", mode], queryFn: () => getIncidents(mode) }),
  incident: (id: string) => queryOptions({ queryKey: ["incident", id], queryFn: () => getIncident(id) }),
  graph: (id: string) => queryOptions({ queryKey: ["graph", id], queryFn: () => getGraph(id) }),
  logs: (mode: DemoMode, q: Parameters<typeof getLogs>[1] = {}) =>
    queryOptions({ queryKey: ["logs", mode, q], queryFn: () => getLogs(mode, q) }),
  entity: (type: EntityType, id: string) => queryOptions({ queryKey: ["entity", type, id], queryFn: () => getEntity(type, id) }),
  metrics: (mode: DemoMode) => queryOptions({ queryKey: ["metrics", mode], queryFn: () => getMetrics(mode) }),
};
