import { HealthMetric } from "@/types/health-metric";

export function latestByType(metrics: HealthMetric[]): HealthMetric[] {
  const map = new Map<string, HealthMetric>();

  for (const m of metrics) {
    const prev = map.get(m.type);
    if (!prev) {
      map.set(m.type, m);
      continue;
    }
    if (new Date(m.timestamp).getTime() > new Date(prev.timestamp).getTime()) {
      map.set(m.type, m);
    }
  }

  return Array.from(map.values());
}