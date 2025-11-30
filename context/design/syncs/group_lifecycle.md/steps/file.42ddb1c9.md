---
timestamp: 'Sat Nov 29 2025 16:48:22 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_164822.97e5a0f1.md]]'
content_id: 42ddb1c96a395b2fa5bf7bd616d6317d48b4cadccd97083d0f0de49def44a6d0
---

# file: src/syncs/groups/GroupSyncs.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Groups, MemoryEntries } from "@concepts";

/**
 * sync DeleteEmptyGroup
 *
 * when
 *   Groups.leaveGroup(user, group)
 * where
 *   in Groups: members of group becomes empty AND invitedMembers of group is empty
 * then
 *   Groups.deleteGroup(group)
 */
export const DeleteEmptyGroup: Sync = ({ user, group, members, invitedMembers }) => ({
  when: actions(
    [Groups.leaveGroup, { user, group }, {}],
  ),
  where: async (frames) => {
    // After a user leaves, check the state of the group they left
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, { members, invitedMembers });
    // If the group has no members and no pending invitations, it can be deleted
    return frames.filter(($) => $[members].length === 0 && $[invitedMembers].length === 0);
  },
  then: actions(
    [Groups.deleteGroup, { group }],
  ),
});

/**
 * sync CascadeGroupDeletionToMemories
 *
 * when
 *   Groups.deleteGroup(group)
 * where
 *   in MemoryEntries: group of memory is group
 * then
 *   MemoryEntries.deleteMemory(memory, creator)
 */
export const CascadeGroupDeletionToMemories: Sync = ({ group, memory, creator }) => ({
  when: actions(
    [Groups.deleteGroup, { group }, {}],
  ),
  where: async (frames) => {
    // When a group is deleted, find all memories associated with that group.
    // This query will produce a new frame for each memory found, enabling the
    // 'then' clause to fire for each one individually.
    // NOTE: This assumes the MemoryEntries concept has a query `_getMemoriesByGroup`
    // that returns both the memory and its creator, as required by `deleteMemory`.
    return await frames.query(MemoryEntries._getMemoriesByGroup, { group }, { memory, creator });
  },
  then: actions(
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});
```
