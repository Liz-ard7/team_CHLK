---
timestamp: 'Sat Dec 06 2025 00:59:24 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251206_005924.b0717978.md]]'
content_id: 38deafa3c204fd5fd3ddc138485b802041c2ba332ad41e33d1d731ad15d5f5bb
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
    // For each group that a user just left, get its current list of members and invited members.
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, { members, invitedMembers });
    // Filter to keep only the frames for groups that are now completely empty.
    // We must cast the values from the frame (which are `unknown`) to an array type to access .length.
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
export const CascadeGroupDeletionToMemories: Sync = ({ group, memory, creator, memoryList, memoryObject }) => ({
  when: actions(
    [Groups.deleteGroup, { group }, {}],
  ),
  where: async (frames) => {
    // 1. Query for the list of memories. This returns a single frame where `memoryList` is an array of memory IDs.
    const framesWithList = await frames.query(MemoryEntries._listMemoriesForGroup, { groupID: group }, { memories: memoryList });

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

    // 3. Create a new Frames instance and query for the full memory object for each memory ID.
    let perMemoryFrames = new Frames(...expandedFrames);
    // The _getMemory query returns `{ memory: { creator: '...' } }`. We bind this whole object to `memoryObject`.
    perMemoryFrames = await perMemoryFrames.query(MemoryEntries._getMemory, {
      memoryID: memory,
    }, { memory: memoryObject });

    // 4. Map over the resulting frames to extract the `creator` from the nested `memoryObject`.
    const finalFrames = perMemoryFrames.map(($) => {
      // Assert the type of the memory object we just fetched.
      const memObj = $[memoryObject] as { creator: ID };
      return {
        ...$, // Keep all existing bindings (group, memory, memoryObject)
        [creator]: memObj.creator, // Add the new `creator` binding
      };
    });

    return new Frames(...finalFrames);
  },
  then: actions(
    // The `then` clause will now fire once for each frame produced by the `where` clause.
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```
