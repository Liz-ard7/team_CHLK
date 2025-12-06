---
timestamp: 'Sat Dec 06 2025 00:51:57 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251206_005157.8f430fa5.md]]'
content_id: f2bfac655730b2842f64b0e5e1448be53b8489ffc2454d8324dfc93dca08455c
---

# Prompt: Could you modify this sync to make sure to call \_getMemory and assign creator = the result of \_getMemory.creator for each of the memories to be deleted.

export const CascadeGroupDeletionToMemories: Sync = (
{ group, memory, creator, memoryList },
) => ({
when: actions(
\[Groups.deleteGroup, { group }, {}],
),
where: async (frames) => {
// 1. Query for the list of memories. This returns a single frame where `memoryList` is an array of memory IDs.
const framesWithList = await frames.query(
MemoryEntries.\_listMemoriesForGroup,
{ groupID: group },
{ memories: memoryList },
);

```
// 2. Expand the single frame into multiple frames, one for each memory ID in the list.
const expandedFrames = framesWithList.flatMap(($) => {
  const memories = $[memoryList] as ID[]; // Assert the type to an array of IDs
  if (!memories || memories.length === 0) {
    return []; // No memories, so no frames to generate.
  }
  // Create a new frame object for each memory, carrying over existing bindings like `group`.
  return memories.map((memID) => ({
    ...$,
    [memory]: memID, // Bind the single `memory` variable for the next query
  }));
});

// If no memories were found, return an empty set of frames to halt the synchronization.
if (expandedFrames.length === 0) {
  return new Frames();
}

// 3. Create a new Frames instance and query for the creator of each individual memory.
let perMemoryFrames = new Frames(...expandedFrames);
perMemoryFrames = await perMemoryFrames.query(MemoryEntries._getMemory, {
  memoryID: memory,
}, { creator });

return perMemoryFrames;
```

},
then: actions(
// The `then` clause will now fire once for each frame produced by the `where` clause.
\[MemoryEntries.deleteMemory, { memory, creator }],
),
});
