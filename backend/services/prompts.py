"""
Prompt construction for health summaries.

Prompts live on the server so the client never sends free-form text to the
model. The mobile app posts structured statistics; this module turns them into
the wording, and callers cannot smuggle instructions through that boundary.
"""

from api.models import (
    DashboardSummaryPayload,
    MetricSummaryPayload,
    SleepSummaryPayload,
    TrendsSummaryPayload,
)

# Shared voice rules. The app is accessibility-first: summaries are read aloud
# by a screen reader as often as they are read on screen.
_VOICE = (
    "Keep it conversational and supportive. Do not use medical jargon. "
    "Do not diagnose. Return only the summary text, with no headers or bullets."
)


def build_metric_prompt(payload: MetricSummaryPayload, time_range_text: str) -> str:
    """Builds the single-metric detail summary prompt from precomputed stats."""
    unit = payload.unit
    return f"""You are a health coach analyzing {payload.metric_name} data. Generate a one sentence summary.

Data for {time_range_text}:
- Range: {payload.min}-{payload.max} {unit}
- Average: {payload.avg} {unit}
- Median: {payload.median} {unit}
- Variability: {payload.std_dev} {unit} (std dev)
- Total readings: {payload.total_readings}
- Normal readings: {payload.normal_count}
- Elevated readings: {payload.warning_count}
- High readings: {payload.danger_count}
- Outliers: {payload.outlier_count}

Focus on:
1. Overall stability or variability
2. Any concerning patterns (spikes, elevated readings)
3. Brief, actionable insight or reassurance

Round all numbers to whole numbers. {_VOICE}"""


def build_sleep_prompt(payload: SleepSummaryPayload, time_range_text: str) -> str:
    """Builds the sleep-specific summary prompt from a stage breakdown."""
    return f"""You are a sleep coach analyzing sleep data. Generate a 1-2 sentence summary.

Sleep data for {time_range_text}:
- Time in bed: {payload.total_in_bed}
- Time asleep: {payload.total_sleep}
- Sleep efficiency: {payload.efficiency}%
- Sleep quality: {payload.quality}
- Deep sleep: {payload.deep_sleep} ({payload.deep_pct}%)
- REM sleep: {payload.rem_sleep} ({payload.rem_pct}%)
- Light sleep: {payload.light_sleep} ({payload.light_pct}%)
- Awake time: {payload.awake}
- Total sessions: {payload.sessions}

Focus on:
1. Sleep quality and efficiency
2. Balance of sleep stages (deep, REM, light)
3. Brief, actionable insight or reassurance

{_VOICE}"""


def build_dashboard_prompt(payload: DashboardSummaryPayload) -> str:
    """Builds the home dashboard summary prompt from the visible metric cards."""
    metric_lines = "\n".join(
        f"- {card.title}: {card.value_text}. Status: {card.subtitle}."
        for card in payload.cards
    )
    return f"""You are writing a spoken and readable health summary for a blind or low-vision user.

Write:
1. A short 2-3 sentence summary for the main dashboard
2. It must be very clear when read aloud
3. It must be supportive and non-diagnostic
4. Mention only the most useful takeaways
5. Avoid saying "consult a doctor" unless the data strongly suggests concern
6. Keep it concise

Dashboard metrics:
{metric_lines}

Counts across loaded metrics:
- Normal readings: {payload.normal_count}
- Elevated readings: {payload.warning_count}
- High readings: {payload.danger_count}

{_VOICE}"""


def build_trends_prompt(payload: TrendsSummaryPayload, time_range_text: str) -> str:
    """Builds the cross-metric trend comparison prompt for the Trends screen."""
    metric_lines = "\n".join(
        f"- {s.label}: range {round(s.min)}-{round(s.max)} {s.unit}, "
        f"avg {s.avg:.1f} {s.unit}, {s.count} readings, {s.outlier_count} outlier(s)"
        for s in payload.series
    )
    return f"""You are writing a health trend comparison for a blind or low-vision user.
This will be read aloud by a screen reader and also displayed as text.

Time period: {time_range_text}
Selected metrics:
{metric_lines}

Write:
1. A 3-4 sentence spoken-friendly comparison across these metrics
2. Highlight any notable patterns, correlations, or concerns
3. Be supportive and non-diagnostic
4. Write in flowing sentences, no bullet points
5. If you notice a correlation (e.g. high activity days also show elevated heart rate), mention it
6. End with one brief, actionable observation

{_VOICE}"""
