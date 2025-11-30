---
timestamp: 'Sat Nov 29 2025 16:46:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_164639.36aaa63d.md]]'
content_id: e806ba93ae3dd9a802797b1a1da8330fce3b90827127f2b8a639b0316f867360
---

# file: src/syncs/groups/CascadeUserDeletionToGroups.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Groups, UserAuthentication } from "@concepts";
import { ID } from "@utils/types.ts";

// Define local types for clarity, matching the concept's generic types.
type User = ID;
type Group = ID;

/**
 * @sync CascadeUserDeletionToGroups
 * @description When a user is deleted, this synchronization ensures they are removed from all groups they are a member of.
 */
export const CascadeUserDeletionToGroups: Sync = ({ user, group, groupList }) => ({
  when: actions(
    // Trigger when any user is successfully deleted.
    [UserAuthentication.deleteUser, { user }, {}],
  ),
  where: async (frames) => {
    // For the deleted 'user', find all groups they were a member of.
    // The '_listGroupsForUser' query returns a single frame with a 'groups' array property.
    frames = await frames.query(
      Groups._listGroupsForUser,
      { user },
      { groups: groupList }, // Bind the array of group IDs to the 'groupList' variable.
    );

    // We need to expand the single frame into multiple frames, one for each group,
    // so the 'then' clause can fire 'leaveGroup' for each group individually.
    return frames.flatMap(($) => {
      // Get the list of groups from the current frame's bindings.
      const groupsForUser = $[groupList] as Group[] | undefined;

      // If the user was not in any groups, return an empty array to stop the sync.
      if (!groupsForUser || groupsForUser.length === 0) {
        return [];
      }

      // Create a new frame for each group the user was a member of.
      return groupsForUser.map((g) => ({
        ...$, // Preserve existing bindings (like 'user').
        [group]: g, // Add a new binding for the 'group' variable.
      }));
    });
  },
  then: actions(
    // For each frame produced by the 'where' clause, execute 'leaveGroup'.
    [Groups.leaveGroup, { user, group }],
  ),
});
```
