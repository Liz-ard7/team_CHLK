---
timestamp: 'Sat Nov 29 2025 19:20:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_192020.3905c932.md]]'
content_id: 52e09e8d78347cd62f4cadb328a462a54d7867c646f5c7e8c05131571209f37f
---

# solution:

1. The `DeleteEmptyGroup` issue is resolved by adding a simple type assertion. We can safely cast `$[members]` and `$[invitedMembers]` to `unknown[]` to allow the `.length` property check.
2. The `CascadeGroupDeletionToMemories` sync requires rewriting the `where` clause to correctly process the data. The solution is to first query for the array of memories, then use `flatMap` to "expand" the single frame into multiple frames (one for each memory), and finally run the `_getMemory` query on each of the new frames. This requires importing the `Frames` constructor from the engine and adjusting the sync's function signature.

Here is the corrected implementation in a single file.
