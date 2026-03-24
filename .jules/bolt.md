## 2024-03-24 - Optimize registerClub
**Learning:** Sequential `await` calls in `for` loops inside `registerClub` cause N+1 latency issues with `inFidelimaxNoteCheck`.
**Action:** Use chunked `Promise.all` arrays to parallelize these calls to reduce API latency while respecting limits.
