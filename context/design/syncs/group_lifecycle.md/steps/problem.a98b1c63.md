---
timestamp: 'Sat Nov 29 2025 19:20:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_192020.3905c932.md]]'
content_id: a98b1c635bdda8436fc22313f9fe5d889bb2b4d51dd82051fc0a56862ab551be
---

# problem:

There are two issues in the provided synchronization code:

1. **Direct Type Error**: In the `DeleteEmptyGroup` sync, the `where` clause attempts to access the `.length` property on variables (`$[members]` and `$[invitedMembers]`) that TypeScript correctly identifies as `unknown`. This causes a compile-time error because properties cannot be accessed on an `unknown` type without a type assertion.
2. **Logical/Type Mismatch Error**: In the `CascadeGroupDeletionToMemories` sync, there is a more subtle logical error that leads to a type mismatch. Based on the implementation patterns described (`_listGroupsForUser` returning `Array<{ groups: Group[] }>`), the query `_listMemoriesForGroup` will return a *single frame* containing an array of all memory IDs. However, the next line of code attempts to run the `_getMemory` query, which expects a single `memoryID`, by passing it the variable `memory` which now holds an entire array of IDs. This mismatch between expecting a single ID and receiving an array is the root cause of the problem. The sync is written as if the first query generates multiple frames (one per memory), but it generates only one.
