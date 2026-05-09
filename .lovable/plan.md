## Goal
Make the main job board personalized to each user's profile instead of pure newest-first, fix the broken "Job matches for you" counts, and apply the new weighting (Skills 50% / Title 30% / Experience 20%). Keep all existing UI, filters, and other behavior unchanged.

## Scope of changes

### 1. Update the match scoring formula (`src/lib/jobMatcher.ts`)
Rebalance weights to match the spec:
- Skills 50% (was 37%) — matched job-required skills ÷ total job skills
- Title 30% (was 38%) — synonym/word-overlap proximity to user's primary role / current_title
- Experience 20% (was 25%) — bucketed:
  - User 0–2 yrs → entry 20, mid 10, senior 0
  - User 2–5 yrs → mid/associate 20, entry 15, senior 5
  - User 5+ yrs → senior 20, mid 15, entry 5
- Match-tier thresholds used by the panel:
  - Strong ≥ 70, Good 40–69, Needs skills < 40

### 2. Personalize the main job feed
Currently `useJobSearchPaginated` returns jobs in DB order (newest first). Change so that for **logged-in users with profile data**:

1. Fetch a larger candidate pool (current page + lookahead) from the existing `search_jobs` / jobs query — **same filters, same role chips, same search text**.
2. Score every candidate against the user's profile (skills + resume parsed skills, current_title, experience_years).
3. Sort by:
   - Match score descending
   - **Tiebreaker (within 10 points)** → more recent posted_date first
   - Stable fallback → posted_date desc
4. Push jobs the user has already applied to or saved to the bottom (load both lists once and re-rank).
5. Slice into pages of 20.

For **logged-out users** or **users with no skills + no resume + no current_title**: keep current newest-first behavior unchanged and let the existing `ProfileCompletionBanner` continue to prompt completion (the current banner already says "Complete your profile…" — no new banner needed).

Role category chips and the search bar already filter the candidate pool via `search_jobs`; they keep working — personalization runs on top of whatever the chip/search returned.

### 3. Fix the "Job matches for you" panel (`JobMatchesPanel.tsx`)
The panel reads from `useRecommendedJobs` and computes a percent against the top job's score, so when no job hits 70% relative it shows 0/0/0. Switch to absolute thresholds straight from `matchResult.score`:
- Strong ≥ 70
- Good 40–69
- Needs skills < 40 (and ≥ 20 to keep noise out)

No layout / copy changes.

### 4. Caching
Add a per-user, per-job-set in-memory React-Query cache keyed by `(userId, profileFingerprint, search/filter, page)` with a 1-hour `staleTime`. The cache key already includes search/page; we just lengthen `staleTime` to 60 min for the personalized branch and invalidate it when the profile mutates (we already do this on resume upload via `resumeVersion`).

No edge function or DB function is needed — all scoring is pure JS over the candidate pool we already fetch, which keeps latency low and avoids paying for a new edge invocation per page. (We can revisit moving to an edge function later if pool sizes grow; the spec allows either.)

## Files touched
- `src/lib/jobMatcher.ts` — new weights + experience buckets + threshold helper
- `src/hooks/useJobSearchPaginated.ts` — overfetch + score + re-rank + push applied/saved down + 60-min cache for personalized branch
- `src/hooks/useAppliedSavedJobIds.ts` (new, tiny) — fetch the user's applied + saved job IDs once
- `src/components/JobMatchesPanel.tsx` — absolute thresholds against `matchResult.score`

## Out of scope (explicitly not changing)
- Existing filters, chips, search bar, pagination UI
- `useRecommendedJobs` ordering for the dedicated Recommendations page (it already sorts by score)
- Hiding applied/saved entirely — the spec says "bottom OR hide"; we push to bottom so users can still revisit them
- Adding a new edge function — JS-side scoring on the already-fetched pool is faster and avoids extra cost; can be promoted later

## Risks
- Overfetching ~120 rows per page request to score them is a slight bandwidth bump; mitigated by the 60-min cache.
- For users with a very narrow profile, the personalized order can feel "stuck" on a few companies — the recency tiebreaker within 10 points + the existing 45-day window prevents staleness.

Confirm and I'll implement.