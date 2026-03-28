## 2024-05-18 - Optimize registerClub notes processing
**Learning:** Processing non-scoring notes sequentially via loop can cause N+1 latency bottlenecks when each item entails a network request.
**Action:** Group notes into chunks and process each chunk via Promise.all to drastically reduce the number of discrete waiting periods.
