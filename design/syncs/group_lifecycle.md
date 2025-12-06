[@implemention-synchronizations](../background/implementing-synchronizations.md)

[@implementation](../concepts/groups/implementation.md)

[@implementation](../concepts/memoryentries/implementation.md)

# Prompt: Write the code for these syncs
#### sync DeleteEmptyGroup

* when
	* Groups.leaveGroup(user, group)
* where
	* in Groups: members of group becomesis empty AND invitedMembers of group is empty
* then
	* Groups.deleteGroup(group)

#### sync CascadeGroupDeletionToMemories

* when
	* Groups.deleteGroup(group)
* where
	* in MemoryEntries: group of memory is group
* then
	* MemoryEntries.deleteMemory(memory, creator)
# response:

Here is the implementation of the two synchronizations, `DeleteEmptyGroup` and `CascadeGroupDeletionToMemories`, in a single file.

# file: src/syncs/groups/cascadeDeletes.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Groups, MemoryEntries } from "@concepts";

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
    return frames.filter(($) => $[members].length === 0 && $[invitedMembers].length === 0);
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
export const CascadeGroupDeletionToMemories: Sync = ({ group, memory, creator }) => ({
  when: actions(
    [Groups.deleteGroup, { group }, {}],
  ),
  where: async (frames) => {
    // Find all memories associated with the deleted group. This creates a frame for each memory.
    frames = await frames.query(MemoryEntries._listMemoriesForGroup, { groupID: group }, { memory });
    // For each memory found, enrich its frame with the creator's ID. This is required by the deleteMemory action.
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, { creator });
    return frames;
  },
  then: actions(
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```

# Prompt: There are some type unknown issues
# response:

# problem:

There are two issues in the provided synchronization code:

1.  **Direct Type Error**: In the `DeleteEmptyGroup` sync, the `where` clause attempts to access the `.length` property on variables (`$[members]` and `$[invitedMembers]`) that TypeScript correctly identifies as `unknown`. This causes a compile-time error because properties cannot be accessed on an `unknown` type without a type assertion.
2.  **Logical/Type Mismatch Error**: In the `CascadeGroupDeletionToMemories` sync, there is a more subtle logical error that leads to a type mismatch. Based on the implementation patterns described (`_listGroupsForUser` returning `Array<{ groups: Group[] }>`), the query `_listMemoriesForGroup` will return a *single frame* containing an array of all memory IDs. However, the next line of code attempts to run the `_getMemory` query, which expects a single `memoryID`, by passing it the variable `memory` which now holds an entire array of IDs. This mismatch between expecting a single ID and receiving an array is the root cause of the problem. The sync is written as if the first query generates multiple frames (one per memory), but it generates only one.

# solution:

1.  The `DeleteEmptyGroup` issue is resolved by adding a simple type assertion. We can safely cast `$[members]` and `$[invitedMembers]` to `unknown[]` to allow the `.length` property check.
2.  The `CascadeGroupDeletionToMemories` sync requires rewriting the `where` clause to correctly process the data. The solution is to first query for the array of memories, then use `flatMap` to "expand" the single frame into multiple frames (one for each memory), and finally run the `_getMemory` query on each of the new frames. This requires importing the `Frames` constructor from the engine and adjusting the sync's function signature.

Here is the corrected implementation in a single file.

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
export const CascadeGroupDeletionToMemories: Sync = ({ group, memory, creator, memoryList }) => ({
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

    // 3. Create a new Frames instance and query for the creator of each individual memory.
    let perMemoryFrames = new Frames(...expandedFrames);
    perMemoryFrames = await perMemoryFrames.query(MemoryEntries._getMemory, { memoryID: memory }, { creator });

    return perMemoryFrames;
  },
  then: actions(
    // The `then` clause will now fire once for each frame produced by the `where` clause.
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```

# Prompt: Could you modify this sync to make sure creator is being assigned correctly. Remember that _getMemory returns an array of MemoryDocs.
```typescript
export const CascadeGroupDeletionToMemories: Sync = (
  { group, memory, creator, memoryList },
) => ({
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

    // 3. Create a new Frames instance and query for the creator of each individual memory.
    let perMemoryFrames = new Frames(...expandedFrames);
    perMemoryFrames = await perMemoryFrames.query(MemoryEntries._getMemory, {
      memoryID: memory,
    }, { creator });

    return perMemoryFrames;
  },
  then: actions(
    // The `then` clause will now fire once for each frame produced by the `where` clause.
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```
# response:

# problem:

The user has correctly identified a potential issue with how the `creator` variable is being assigned in the `CascadeGroupDeletionToMemories` synchronization. The problem stems from a mismatch between the structure of the data returned by the `_getMemory` query and the output pattern used in the `where` clause.

Based on the concept specification for `_getMemory (memoryID: String): (memory: Memory)`, the query returns an array containing a single object, where the full `MemoryDoc` (including the `creator` field) is nested under the `memory` key. The returned data structure looks like this: `[{ memory: { _id: ..., creator: 'some_user_id', ... } }]`.

The original code attempted to bind the `creator` directly with the output pattern `{ creator }`. This fails because `creator` is not a top-level key in the returned object; it is nested inside the `memory` object.

# solution:

To fix this, the `where` clause must be modified to correctly handle this nested structure. The solution involves two steps:

1.  **Bind the entire nested object**: First, we modify the `.query` call to fetch the entire nested `memory` object and bind it to a new temporary variable (e.g., `memoryObject`).
2.  **Extract the `creator`**: After the query completes, we map over the resulting frames. In each frame, we access the `memoryObject` we just fetched, extract the `creator` property from it, and add it to the frame as a new, top-level `creator` binding.

This ensures that by the time the `then` clause is executed, the `creator` variable is correctly bound and available for the `MemoryEntries.deleteMemory` action.

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