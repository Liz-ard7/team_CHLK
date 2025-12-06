---
timestamp: 'Sat Dec 06 2025 00:59:24 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251206_005924.b0717978.md]]'
content_id: 22f578475ffa3b480b630315242d7d486f7d2948894fbe806e8edad7ce029fc2
---

# solution:

To fix this, the `where` clause must be modified to correctly handle this nested structure. The solution involves two steps:

1. **Bind the entire nested object**: First, we modify the `.query` call to fetch the entire nested `memory` object and bind it to a new temporary variable (e.g., `memoryObject`).
2. **Extract the `creator`**: After the query completes, we map over the resulting frames. In each frame, we access the `memoryObject` we just fetched, extract the `creator` property from it, and add it to the frame as a new, top-level `creator` binding.

This ensures that by the time the `then` clause is executed, the `creator` variable is correctly bound and available for the `MemoryEntries.deleteMemory` action.
