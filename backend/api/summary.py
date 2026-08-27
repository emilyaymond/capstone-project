"""
Health summary endpoint.

The mobile app used to call OpenAI directly with an EXPO_PUBLIC_ key, which
shipped inside the app bundle. It now posts precomputed statistics here and the
server owns both the credential and the prompt wording.
"""

import logging

from fastapi import APIRouter, HTTPException

from api.models import SummaryRequest, SummaryResponse
from services.client import ai_client
from services.prompts import (
    build_dashboard_prompt,
    build_metric_prompt,
    build_sleep_prompt,
    build_trends_prompt,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Per-kind generation limits, matching what each card renders.
_LIMITS = {
    "metric": (150, 0.7),
    "sleep": (150, 0.7),
    "dashboard": (140, 0.5),
    "trends": (200, 0.5),
}


def _build_prompt(request: SummaryRequest) -> str:
    """Selects and builds the prompt for the requested summary kind."""
    if request.kind == "metric":
        if not request.metric:
            raise HTTPException(400, "kind 'metric' requires a `metric` payload")
        return build_metric_prompt(request.metric, request.time_range_text)

    if request.kind == "sleep":
        if not request.sleep:
            raise HTTPException(400, "kind 'sleep' requires a `sleep` payload")
        return build_sleep_prompt(request.sleep, request.time_range_text)

    if request.kind == "dashboard":
        if not request.dashboard:
            raise HTTPException(400, "kind 'dashboard' requires a `dashboard` payload")
        return build_dashboard_prompt(request.dashboard)

    if not request.trends:
        raise HTTPException(400, "kind 'trends' requires a `trends` payload")
    return build_trends_prompt(request.trends, request.time_range_text)


@router.post("/summary", response_model=SummaryResponse)
async def generate_summary(request: SummaryRequest) -> SummaryResponse:
    """Generates a spoken-friendly health summary from precomputed statistics."""
    prompt = _build_prompt(request)

    if not ai_client.is_configured:
        # Not an error: every caller renders a deterministic local fallback, so
        # the app stays usable without a key.
        return SummaryResponse(summary="", model_used="none", configured=False)

    max_tokens, temperature = _LIMITS[request.kind]

    try:
        text = await ai_client.complete(
            prompt, max_tokens=max_tokens, temperature=temperature
        )
    except Exception:
        # Log the detail, return a generic message. Upstream errors can carry
        # request context and should not be echoed to clients verbatim.
        logger.exception("Summary generation failed for kind=%s", request.kind)
        raise HTTPException(502, "Summary generation failed")

    return SummaryResponse(
        summary=text,
        model_used=ai_client.model or "unknown",
        configured=True,
    )
