---
timestamp: 'Sat Nov 29 2025 17:13:29 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_171329.0bafc4cb.md]]'
content_id: dcda9362efd364221b7bd214904654d2303bbd9eff35402707838cfdd23d1df7
---

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
