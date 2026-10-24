# Deeper public-source research

The former pipeline made one search request for at most five results. The local research registry is now configured for six focused queries, up to five results per query, and at most 25 discovered URLs. Query topics include identity, official/contact information, reviews and complaints, news/public records, and ownership. Results are interleaved across queries, tracking duplicates are removed, and multiple hosts are preferred before additional same-host pages.

PadiCheck retrieves source pages separately using its existing bounded public-page fetcher. A collection budget of 180 seconds stops new search/fetch operations; an already-running bounded request can finish after that time. Each query, page fetch and publication rechecks ownership and permitted tools. Partial query failures preserve successful results and readable submitted pages. Incomplete collection is explicitly passed to Gemini for inclusion in limitations.

Analysis selects up to 20 excerpts, prioritising retrieved pages/documents over snippets and preferring host diversity. Each excerpt is capped at 6,000 characters and the total remains capped at 96,000 characters. This broadens coverage without increasing the previous maximum excerpt-text budget. Findings still need exact quotations from supplied evidence; a search result or automated finding is not independent verification.

The user-facing layout is unchanged. New investigations use the active registry configuration. Completed historical checks retain their original evidence and results. Uploaded contract reviews do not send document text or the contract question to web search.

## Configuration

The `ultrasearch_search` tool accepts these validated configuration fields through authenticated AI administration:

| Field | Valid range | Local configuration |
| --- | --- | --- |
| `max_results` | 1–5 per query | 5 |
| `max_queries` | 1–8 | 6 |
| `max_sources` | 5–30 | 25 |
| `max_seconds` | 30–180 | 180 |

For an existing tool, an administrator with `ai_config.manage` can PATCH `/v1/admin/ai/tools/{tool_id}` with:

```json
{
  "tool_config": {
    "max_results": 5,
    "max_queries": 6,
    "max_sources": 25,
    "max_seconds": 180
  }
}
```

Omitting `max_queries` retains the legacy one-query behavior. API/schema bounds also apply inside the worker, so invalid direct database configuration fails explicitly. Config changes are audited. This configuration was enabled locally on 24 October 2026.

## Validation

All 24 backend research, planning, evidence and AI-administration tests pass. Backend semantic typecheck passes. Tests cover broader real database source persistence using provider doubles, query deduplication, source diversity, text budgets, partial failures, cancellation, strict citations and contract privacy. OpenAPI and API-reference snapshots have been regenerated.

A live worker investigation titled `Deep search integration check (Mozilla)` completed under the existing test account in 60.01 seconds. All six search queries succeeded. It collected 25 sources, retrieved 21 pages, analysed 20 source excerpts, and saved four findings. All five saved evidence quotations matched their linked source excerpts. The successful Gemini run used 14,393 input tokens and 1,139 output tokens. API, frontend proxy and UltraSearch health checks returned 200 afterward.

Open the [live test report](http://localhost:5713/result/83cc5b57-6cc2-4545-8a64-6d363453b5d6) while signed into the existing test account. These figures describe this test, not a guarantee of source availability, runtime or findings for every query.
