"""Pluggable AI analysis providers."""

from __future__ import annotations

import config
from .base import AnalysisProvider, ANALYSIS_SCHEMA


def get_provider(name: str | None = None) -> AnalysisProvider:
    name = (name or config.AI_PROVIDER or "anthropic").lower()
    if name == "anthropic":
        from .anthropic_provider import AnthropicProvider

        return AnthropicProvider()
    if name == "stub":
        from .stub_provider import StubProvider

        return StubProvider()
    raise ValueError(f"Unknown AI provider: {name!r} (expected 'anthropic' or 'stub')")


__all__ = ["get_provider", "AnalysisProvider", "ANALYSIS_SCHEMA"]
