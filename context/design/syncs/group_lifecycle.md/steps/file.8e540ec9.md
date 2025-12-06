---
timestamp: 'Sat Dec 06 2025 00:52:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251206_005249.3f2399f0.md]]'
content_id: 8e540ec93526539bea60422a94539ff01ccec550672c7ddb778a68891162a88c
---

# file: src/syncs/groups/cascadeDeletes.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
import { Groups, MemoryEntries } from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * @sync DeleteEmptyGroup
 * @description When a user leaves a group, check if the group is now empty (no members and no pending invitations). If it is, delete the group.
 * @spec
 *   when
 *     Groups.leaveGroup(user, group)
 *   where
 *     in Groups: members of group is empty AND invitedMembers of group is empty
 *   then
 *     Groups.deleteGroup(group)
 */
export const DeleteEmptyGroup: Sync = ({ user, group, members, invitedMembers }) => ({
  when: actions(
    [Groups.leaveGroup, { user, group }, {}],
  ),
  where: async (frames) => {
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, { members, invitedMembers });
    return frames.filter(($) => ($[members] as unknown[]).length === 0 && ($[invitedMembers] as unknown[]).length === 0);
  },
  then: actions(
    [Groups.deleteGroup, { group }],
  ),
});

/**
 * @sync CascadeGroupDeletionToMemories
 * @description When a group is deleted, find and delete all associated memories.
 * @spec
 *   when
 *     Groups.deleteGroup(group)
 *   where
 *     in MemoryEntries: group of memory is group
 *   then
 *     MemoryEntries.deleteMemory(memory, creator)
 */
export const CascadeGroupDeletionToMemories: Sync = ({ group, memory, creator, memoryList }) => ({
  when: actions(
    [Groups.deleteGroup, { group }, {}],
  ),
  where: async (frames) => {
    // 1. Query for the list of memories. This returns a single frame where `memoryList` is an array of memory IDs.
    const framesWithList = await frames.query(
      MemoryEntries._listMemoriesForGroup,
      { groupID: group },
      { memories: memoryList },
    );

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

    // 3. For each frame (now corresponding to a single memory), query for its full document.
    let perMemoryFrames = new Frames(...expandedFrames);
    const memoryDoc = Symbol("memoryDoc"); // Temporary variable to hold the full memory document.
    perMemoryFrames = await perMemoryFrames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc }, // The query returns { memory: ... }, so we bind the inner document to `memoryDoc`.
    );

    // 4. Map over the frames to extract the creator's ID from the document and bind it to the `creator` variable.
    const finalFrames = perMemoryFrames.map(($) => {
      const doc = $[memoryDoc] as { creator: ID }; // Assert the type of the document we fetched.
      // Return a new frame that includes the original bindings plus the new `creator` binding.
      return {
        ...$,
        [creator]: doc.creator,
      };
    });

    return new Frames(...finalFrames);
  },
  then: actions(
    // This will now fire for each frame, with both `memory` (ID) and `creator` (ID) correctly bound.
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```
