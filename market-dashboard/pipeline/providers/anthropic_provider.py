"""Claude-powered analysis via the official Anthropic SDK.

Design notes:
- Model defaults to claude-opus-4-8 (override with ANTHROPIC_MODEL).
- Adaptive thinking is enabled for higher-quality structured reasoning.
- Structured output (output_config.format) guarantees schema-valid JSON.
- The large, stable system prompt carries a cache_control breakpoint, so when
  a single run analyses several weeks the system prefix is read from cache
  (~0.1x cost) instead of reprocessed each call. The volatile transcript sits
  after the breakpoint, in the user turn.
"""

from __future__ import annotations

import json

import config
from .base import (
    AnalysisProvider,
    ANALYSIS_SCHEMA,
    SYSTEM_PROMPT,
    build_user_prompt,
)


class AnthropicProvider(AnalysisProvider):
    name = "anthropic"

    def __init__(self) -> None:
        if not config.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Set it, or run with "
                "AI_PROVIDER=stub for a no-cost extractive analysis."
            )
        import anthropic  # imported lazily so 'stub' runs without the SDK

        self.client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)
        self.model = config.ANTHROPIC_MODEL

    def analyze(self, metadata: dict, transcript_text: str) -> dict:
        response = self.client.messages.create(
            model=self.model,
            max_tokens=16000,
            thinking={"type": "adaptive"},
            system=[
                {
                    "type": "text",
                    "text": SYSTEM_PROMPT,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": build_user_prompt(metadata, transcript_text),
                }
            ],
            output_config={
                "format": {
                    "type": "json_schema",
                    "schema": ANALYSIS_SCHEMA,
                }
            },
        )

        # With structured output the text block is guaranteed schema-valid JSON.
        text = next(
            (b.text for b in response.content if getattr(b, "type", None) == "text"),
            None,
        )
        if text is None:
            raise RuntimeError(
                f"No text block in Claude response (stop_reason={response.stop_reason})"
            )
        result = json.loads(text)
        result["_provider"] = self.name
        result["_model"] = response.model
        result["_usage"] = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "cache_read_input_tokens": getattr(
                response.usage, "cache_read_input_tokens", 0
            ),
            "cache_creation_input_tokens": getattr(
                response.usage, "cache_creation_input_tokens", 0
            ),
        }
        return result
