"""
Request models for the summary endpoint.

The client posts precomputed statistics rather than prose. Every field here is
a number, an enum, or a short label the server formats into a prompt, so the
endpoint cannot be used as a general-purpose model proxy.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field

SummaryKind = Literal["metric", "sleep", "dashboard", "trends"]

# Caps that keep a request from ballooning into an expensive prompt.
MAX_CARDS = 12
MAX_SERIES = 12
MAX_LABEL = 64


class MetricSummaryPayload(BaseModel):
    """Precomputed statistics for a single metric's detail screen."""

    metric_name: str = Field(max_length=MAX_LABEL)
    unit: str = Field(default="", max_length=16)
    min: float
    max: float
    avg: float
    median: float
    std_dev: float
    outlier_count: int = Field(ge=0)
    normal_count: int = Field(ge=0)
    warning_count: int = Field(ge=0)
    danger_count: int = Field(ge=0)
    total_readings: int = Field(ge=0)


class SleepSummaryPayload(BaseModel):
    """Sleep stage breakdown, pre-formatted as human-readable durations."""

    total_in_bed: str = Field(max_length=32)
    total_sleep: str = Field(max_length=32)
    efficiency: int
    quality: str = Field(max_length=32)
    deep_sleep: str = Field(max_length=32)
    deep_pct: int
    rem_sleep: str = Field(max_length=32)
    rem_pct: int
    light_sleep: str = Field(max_length=32)
    light_pct: int
    awake: str = Field(max_length=32)
    sessions: int = Field(ge=0)


class DashboardCard(BaseModel):
    """One metric card as shown on the home dashboard."""

    title: str = Field(max_length=MAX_LABEL)
    value_text: str = Field(max_length=MAX_LABEL)
    subtitle: str = Field(default="", max_length=160)


class DashboardSummaryPayload(BaseModel):
    """The visible dashboard cards plus range counts across loaded metrics."""

    cards: List[DashboardCard] = Field(max_length=MAX_CARDS)
    normal_count: int = Field(default=0, ge=0)
    warning_count: int = Field(default=0, ge=0)
    danger_count: int = Field(default=0, ge=0)


class TrendsSeries(BaseModel):
    """Summary statistics for one metric selected on the Trends screen."""

    label: str = Field(max_length=MAX_LABEL)
    unit: str = Field(default="", max_length=16)
    min: float
    max: float
    avg: float
    count: int = Field(ge=0)
    outlier_count: int = Field(default=0, ge=0)


class TrendsSummaryPayload(BaseModel):
    """The set of metrics currently being compared."""

    series: List[TrendsSeries] = Field(max_length=MAX_SERIES)


class SummaryRequest(BaseModel):
    """A request for one of the four summary flavours the app renders."""

    kind: SummaryKind
    time_range_text: str = Field(default="", max_length=MAX_LABEL)
    metric: Optional[MetricSummaryPayload] = None
    sleep: Optional[SleepSummaryPayload] = None
    dashboard: Optional[DashboardSummaryPayload] = None
    trends: Optional[TrendsSummaryPayload] = None


class SummaryResponse(BaseModel):
    """The generated summary plus whether the model actually produced it."""

    summary: str
    model_used: str
    configured: bool
