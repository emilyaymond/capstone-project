import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { HealthMetric } from "@/types/health-metric";

interface SleepChartProps {
  data: HealthMetric[];
  width: number;
  height: number;
  timeRange: "H" | "D" | "W" | "M" | "6M" | "Y";
  accessibilityLabel?: string;
}

type StageKey = "awake" | "rem" | "core" | "deep";

type StageSegment = {
  start: Date;
  end: Date;
  stage: StageKey;
};

type AggregateBucket = {
  key: string;
  label: string;
  deep: number;
  core: number;
  rem: number;
  awake: number;
};

const COLORS: Record<StageKey, string> = {
  awake: "#FF7A59",
  rem: "#5AC8FA",
  core: "#0A84FF",
  deep: "#5856D6",
};

const STAGE_ORDER: StageKey[] = ["awake", "rem", "core", "deep"];

const STAGE_LABELS: Record<StageKey, string> = {
  awake: "Awake",
  rem: "REM",
  core: "Core",
  deep: "Deep",
};

export function SleepChart({
  data,
  width,
  height,
  timeRange,
  accessibilityLabel,
}: SleepChartProps) {
  const isTimelineView = timeRange === "H" || timeRange === "D";

  const timeline = useMemo(() => {
    if (!isTimelineView || data.length === 0) return null;

    const segments = buildTimelineSegments(data);
    if (segments.length === 0) return null;

    const minStart = new Date(
      Math.min(...segments.map((segment) => segment.start.getTime())),
    );
    const maxEnd = new Date(
      Math.max(...segments.map((segment) => segment.end.getTime())),
    );

    const totalMs = Math.max(maxEnd.getTime() - minStart.getTime(), 1);

    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, index) => {
      const ratio = index / (tickCount - 1);
      const time = new Date(minStart.getTime() + ratio * totalMs);
      return {
        leftPct: ratio * 100,
        label: formatTimelineTick(time),
      };
    });

    return {
      segments,
      minStart,
      maxEnd,
      totalMs,
      ticks,
    };
  }, [data, isTimelineView]);

  const aggregates = useMemo(() => {
    if (isTimelineView || data.length === 0) return null;
    return buildAggregateBuckets(data, timeRange);
  }, [data, isTimelineView, timeRange]);

  if (
    (!timeline || timeline.segments.length === 0) &&
    (!aggregates || aggregates.length === 0)
  ) {
    return (
      <View style={[styles.container, { width, height }]}>
        <Text style={styles.noData}>No sleep data available</Text>
      </View>
    );
  }

  if (isTimelineView && timeline) {
    const chartHeight = Math.max(180, height);
    const plotHeight = chartHeight - 28;
    const rowHeight = plotHeight / STAGE_ORDER.length;

    return (
      <View
        style={[styles.container, { width }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          accessibilityLabel ??
          `Sleep chart showing ${timeline.segments.length} sleep stage segments`
        }
      >
        <Legend />

        <View
          style={[styles.timelineCard, { width, height: chartHeight + 34 }]}
        >
          <View style={[styles.timelinePlot, { height: plotHeight }]}>
            {STAGE_ORDER.map((stage, index) => {
              const top = index * rowHeight;
              return (
                <React.Fragment key={stage}>
                  <View
                    style={[
                      styles.horizontalRule,
                      { top: top + rowHeight / 2, width: width - 56 },
                    ]}
                  />
                  <Text
                    style={[
                      styles.stageLabel,
                      { top: top + rowHeight / 2 - 8 },
                    ]}
                  >
                    {STAGE_LABELS[stage]}
                  </Text>
                </React.Fragment>
              );
            })}

            {timeline.ticks.map((tick, index) => (
              <View
                key={`tick-${index}`}
                style={[
                  styles.verticalRule,
                  {
                    left: 44 + ((width - 56) * tick.leftPct) / 100,
                    height: plotHeight,
                  },
                ]}
              />
            ))}

            {timeline.segments.map((segment, index) => {
              const stageIndex = STAGE_ORDER.indexOf(segment.stage);
              const leftPct =
                ((segment.start.getTime() - timeline.minStart.getTime()) /
                  timeline.totalMs) *
                100;
              const rightPct =
                ((segment.end.getTime() - timeline.minStart.getTime()) /
                  timeline.totalMs) *
                100;

              const left = 44 + ((width - 56) * leftPct) / 100;
              const segmentWidth = Math.max(
                6,
                ((width - 56) * (rightPct - leftPct)) / 100,
              );

              const rowTop = stageIndex * rowHeight + rowHeight * 0.18;
              const blockHeight = rowHeight * 0.64;

              return (
                <View
                  key={`${segment.stage}-${segment.start.getTime()}-${index}`}
                  style={[
                    styles.segmentBlock,
                    {
                      left,
                      top: rowTop,
                      width: segmentWidth,
                      height: blockHeight,
                      backgroundColor: COLORS[segment.stage],
                    },
                  ]}
                />
              );
            })}
          </View>

          <View style={styles.tickRow}>
            {timeline.ticks.map((tick, index) => (
              <Text key={`tick-label-${index}`} style={styles.tickLabel}>
                {tick.label}
              </Text>
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (aggregates && aggregates.length > 0) {
    const chartHeight = Math.max(180, height);
    const barsMax = Math.max(
      ...aggregates.map(
        (bucket) => bucket.deep + bucket.core + bucket.rem + bucket.awake,
      ),
      1,
    );

    const columnWidth = Math.max(
      10,
      Math.min(28, (width - 48) / Math.max(aggregates.length, 1) - 6),
    );

    return (
      <View
        style={[styles.container, { width }]}
        accessible
        accessibilityRole="image"
        accessibilityLabel={
          accessibilityLabel ??
          `Sleep chart showing ${aggregates.length} summarized periods`
        }
      >
        <Legend />

        <View
          style={[styles.aggregateCard, { width, height: chartHeight + 30 }]}
        >
          <View style={[styles.aggregatePlot, { height: chartHeight }]}>
            {[0.25, 0.5, 0.75, 1].map((ratio) => (
              <View
                key={`rule-${ratio}`}
                style={[
                  styles.aggregateRule,
                  { bottom: ratio * chartHeight - 1, width: width - 24 },
                ]}
              />
            ))}

            <View style={styles.aggregateBarsRow}>
              {aggregates.map((bucket) => {
                const total =
                  bucket.deep + bucket.core + bucket.rem + bucket.awake;
                const totalHeight = Math.max(
                  8,
                  (total / barsMax) * (chartHeight - 12),
                );

                const deepHeight =
                  total > 0 ? (bucket.deep / total) * totalHeight : 0;
                const coreHeight =
                  total > 0 ? (bucket.core / total) * totalHeight : 0;
                const remHeight =
                  total > 0 ? (bucket.rem / total) * totalHeight : 0;
                const awakeHeight =
                  total > 0 ? (bucket.awake / total) * totalHeight : 0;

                return (
                  <View key={bucket.key} style={styles.aggregateBarWrap}>
                    <View
                      style={[styles.aggregateBarTrack, { width: columnWidth }]}
                    >
                      {total > 0 ? (
                        <View
                          style={[
                            styles.aggregateStack,
                            { height: totalHeight, width: columnWidth },
                          ]}
                        >
                          {awakeHeight > 0 && (
                            <View
                              style={[
                                styles.aggregateSlice,
                                styles.roundedTop,
                                {
                                  height: awakeHeight,
                                  backgroundColor: COLORS.awake,
                                  width: columnWidth,
                                },
                              ]}
                            />
                          )}
                          {remHeight > 0 && (
                            <View
                              style={[
                                styles.aggregateSlice,
                                awakeHeight <= 0 &&
                                coreHeight <= 0 &&
                                deepHeight <= 0
                                  ? styles.roundedTop
                                  : null,
                                {
                                  height: remHeight,
                                  backgroundColor: COLORS.rem,
                                  width: columnWidth,
                                },
                              ]}
                            />
                          )}
                          {coreHeight > 0 && (
                            <View
                              style={[
                                styles.aggregateSlice,
                                awakeHeight <= 0 &&
                                remHeight <= 0 &&
                                deepHeight <= 0
                                  ? styles.roundedTop
                                  : null,
                                {
                                  height: coreHeight,
                                  backgroundColor: COLORS.core,
                                  width: columnWidth,
                                },
                              ]}
                            />
                          )}
                          {deepHeight > 0 && (
                            <View
                              style={[
                                styles.aggregateSlice,
                                styles.roundedBottom,
                                awakeHeight <= 0 &&
                                remHeight <= 0 &&
                                coreHeight <= 0
                                  ? styles.roundedTop
                                  : null,
                                {
                                  height: deepHeight,
                                  backgroundColor: COLORS.deep,
                                  width: columnWidth,
                                },
                              ]}
                            />
                          )}
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.aggregateLabel} numberOfLines={1}>
                      {bucket.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return null;
}

function Legend() {
  return (
    <View style={styles.legendRow}>
      {STAGE_ORDER.map((stage) => (
        <View key={stage} style={styles.legendItem}>
          <View
            style={[styles.legendDot, { backgroundColor: COLORS[stage] }]}
          />
          <Text style={styles.legendText}>{STAGE_LABELS[stage]}</Text>
        </View>
      ))}
    </View>
  );
}

function buildTimelineSegments(data: HealthMetric[]): StageSegment[] {
  const sorted = [...data]
    .filter((item) => !!item.timestamp)
    .sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

  const segments: StageSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const currentStart = new Date(current.timestamp);
    const next = sorted[i + 1];
    const nextStart = next ? new Date(next.timestamp) : null;

    const rawDuration = Number(current.value);
    const durationMs =
      Number.isFinite(rawDuration) && rawDuration > 0
        ? inferDurationMs(rawDuration, current.unit)
        : nextStart
          ? Math.max(
              nextStart.getTime() - currentStart.getTime(),
              5 * 60 * 1000,
            )
          : 30 * 60 * 1000;

    const end = nextStart
      ? new Date(
          Math.min(currentStart.getTime() + durationMs, nextStart.getTime()),
        )
      : new Date(currentStart.getTime() + durationMs);

    if (end.getTime() <= currentStart.getTime()) continue;

    segments.push({
      start: currentStart,
      end,
      stage: normalizeStage(current.metadata?.sleepStage),
    });
  }

  return segments;
}

function buildAggregateBuckets(
  data: HealthMetric[],
  timeRange: "W" | "M" | "6M" | "Y",
): AggregateBucket[] {
  const map = new Map<string, AggregateBucket>();

  for (const item of data) {
    const timestamp = new Date(item.timestamp);
    const stage = normalizeStage(item.metadata?.sleepStage);
    const hours = toHours(Number(item.value), item.unit);

    const key = getBucketKey(timestamp, timeRange);
    const label = getBucketLabel(timestamp, timeRange);

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        deep: 0,
        core: 0,
        rem: 0,
        awake: 0,
      });
    }

    const bucket = map.get(key)!;
    bucket[stage] += Math.max(hours, 0);
  }

  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function normalizeStage(stage: unknown): StageKey {
  const value = String(stage ?? "").toLowerCase();

  if (value.includes("awake")) return "awake";
  if (value.includes("rem")) return "rem";
  if (value.includes("deep")) return "deep";
  return "core";
}

function inferDurationMs(value: number, unit?: string): number {
  const normalized = String(unit ?? "").toLowerCase();

  if (normalized.includes("hr")) return value * 60 * 60 * 1000;
  if (normalized === "h" || normalized.includes("hour"))
    return value * 60 * 60 * 1000;
  if (normalized === "min" || normalized.includes("minute"))
    return value * 60 * 1000;

  // Sleep stage samples are often already in hours in your app model.
  if (value <= 12) return value * 60 * 60 * 1000;

  // Otherwise assume minutes.
  return value * 60 * 1000;
}

function toHours(value: number, unit?: string): number {
  const normalized = String(unit ?? "").toLowerCase();

  if (!Number.isFinite(value)) return 0;
  if (normalized.includes("hr")) return value;
  if (normalized === "h" || normalized.includes("hour")) return value;
  if (normalized === "min" || normalized.includes("minute")) return value / 60;

  return value <= 12 ? value : value / 60;
}

function formatTimelineTick(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getBucketKey(date: Date, range: "W" | "M" | "6M" | "Y"): string {
  if (range === "Y") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function getBucketLabel(date: Date, range: "W" | "M" | "6M" | "Y"): string {
  if (range === "W") {
    return date.toLocaleDateString([], { weekday: "short" });
  }

  if (range === "M") {
    return String(date.getDate());
  }

  if (range === "6M") {
    const day = date.getDate();
    if (day === 1) {
      return date.toLocaleDateString([], { month: "short" });
    }
    return "";
  }

  return date.toLocaleDateString([], { month: "short" });
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 2,
  },

  noData: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 14,
    marginTop: 40,
  },

  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "600",
  },

  timelineCard: {
    backgroundColor: "transparent",
  },
  timelinePlot: {
    position: "relative",
    marginLeft: 0,
    marginRight: 0,
  },

  horizontalRule: {
    position: "absolute",
    left: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  verticalRule: {
    position: "absolute",
    top: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "#EFEFF4",
  },
  stageLabel: {
    position: "absolute",
    left: 0,
    width: 38,
    textAlign: "right",
    color: "#8E8E93",
    fontSize: 11,
    fontWeight: "600",
  },
  segmentBlock: {
    position: "absolute",
    borderRadius: 8,
    opacity: 0.95,
  },

  tickRow: {
    marginTop: 8,
    marginLeft: 44,
    marginRight: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tickLabel: {
    fontSize: 11,
    color: "#8E8E93",
    fontWeight: "500",
  },

  aggregateCard: {
    backgroundColor: "transparent",
  },
  aggregatePlot: {
    position: "relative",
    justifyContent: "flex-end",
  },
  aggregateRule: {
    position: "absolute",
    left: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  aggregateBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: "100%",
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  aggregateBarWrap: {
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  aggregateBarTrack: {
    height: "88%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  aggregateStack: {
    justifyContent: "flex-end",
    alignItems: "stretch",
    overflow: "hidden",
    borderRadius: 8,
  },
  aggregateSlice: {
    width: "100%",
  },
  roundedTop: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  roundedBottom: {
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  aggregateLabel: {
    marginTop: 6,
    minHeight: 14,
    fontSize: 10,
    color: "#8E8E93",
    fontWeight: "500",
    textAlign: "center",
    maxWidth: 34,
  },
});
