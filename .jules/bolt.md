
## 2026-03-29 - Unused Expensive API Calls Blocking Main Execution Path
**Learning:** The inventory counting process (`addCount2`) had a severe latency penalty due to an abandoned feature implementation. It was making an expensive cross-service HTTP call (`getProductsByLocation`) to fetch all products in a location and parsing them, but the result was completely unused since the subsequent code that would use it was commented out (`//this.prismaService.updateNotFound2`).
**Action:** Always verify that the results of expensive remote operations or database queries are actually consumed downstream. If a feature relying on them is disabled or commented out, the expensive fetching logic must also be removed or bypassed to prevent silent performance degradation.
