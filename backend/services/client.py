import openai
from typing import Dict, Any, List
from config import settings

# gpt-4o-mini is what the mobile summary cards were calling directly before the
# key moved server-side; keeping it preserves the wording users already see.
OPENAI_SUMMARY_MODEL = "gpt-4o-mini"


class AIClient:
    def __init__(self):
        self.client = None
        self.model = None
        self._initialize_client()

    def _initialize_client(self):
        """Initialize the AI client based on configured service"""
        try:
            if settings.ai_service == "openai" and settings.openai_api_key:
                # AsyncOpenAI: the sync client blocks the event loop inside an
                # async endpoint, serialising every concurrent request.
                self.client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
                self.model = OPENAI_SUMMARY_MODEL
            elif settings.ai_service == "perplexity" and settings.ppx_api_key:
                # Perplexity uses OpenAI-compatible API
                self.client = openai.AsyncOpenAI(
                    api_key=settings.ppx_api_key,
                    base_url="https://api.perplexity.ai"
                )
                self.model = "sonar"
            else:
                print(f"Warning: No valid API key found for service: {settings.ai_service}")
                print("AI features will be disabled until API key is configured")
                self.client = None
        except Exception as e:
            print(f"Warning: Failed to initialize AI client: {e}")
            self.client = None

    @property
    def is_configured(self) -> bool:
        """Reports whether a usable AI client was constructed at startup."""
        return self.client is not None

    async def complete(
        self,
        prompt: str,
        max_tokens: int = 200,
        temperature: float = 0.5,
    ) -> str:
        """Runs a single-turn completion for a prompt this server constructed."""
        if not self.client:
            raise RuntimeError("AI service is not configured")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return (response.choices[0].message.content or "").strip()

    async def analyze_health_data(self, data: Dict[str, Any], query: str = None) -> Dict[str, Any]:
        """Analyze health data and provide insights"""
        if not self.client:
            return {
                "analysis": "AI service is not configured. Please add an API key to enable AI features.",
                "model_used": "none",
                "usage": None
            }

        try:
            # Prepare the prompt for health data analysis
            system_prompt = """You are a health data analysis assistant. Analyze the provided health data and provide:
1. Key insights and trends
2. Potential health recommendations (not medical advice)
3. Data visualization suggestions
4. Areas that might need attention

Always remind users to consult healthcare professionals for medical advice."""

            user_prompt = f"""
Health Data: {data}
User Question: {query if query else "Please analyze this health data and provide insights."}
"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )

            return {
                "analysis": response.choices[0].message.content,
                "model_used": response.model,
                "usage": response.usage.model_dump() if response.usage else None
            }

        except Exception as e:
            raise Exception(f"AI analysis failed: {str(e)}")

    async def generate_chart_suggestions(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate chart type suggestions based on data"""
        if not self.client:
            return [{"suggestion": "AI service not configured. Please add an API key to get chart suggestions.", "type": "error"}]

        try:
            prompt = f"""
Based on this health data structure: {list(data.keys()) if isinstance(data, dict) else str(type(data))},
suggest the 3 most appropriate chart types for visualization.

Return suggestions in this format:
1. Chart Type: [type]
   Reason: [why this chart works well]
   Data Fields: [which fields to use]

Focus on health data visualization best practices.
"""

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.5
            )

            # Parse the response into structured suggestions
            suggestions_text = response.choices[0].message.content
            return [{"suggestion": suggestions_text, "type": "chart_recommendations"}]

        except Exception as e:
            raise Exception(f"Chart suggestion generation failed: {str(e)}")


# Global client instance
ai_client = AIClient()
