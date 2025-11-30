---
timestamp: 'Sat Nov 29 2025 15:17:08 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_151708.fc05ae10.md]]'
content_id: 41685219f10ef27edfb4b28b2ef537b192bf85ede25361396ee1ae9a82dac767
---

# file: src/syncs/CascadeUserDeletionToGroups.sync.ts

```typescript
import { actions, Sync, Frames } from "@engine";
import { UserAuthentication, Groups } from "@concepts";

/**
 * @sync CascadeUserDeletionToGroups
 * @description When a user is deleted, this synchronization finds all the groups
 *              they are a member of and removes them from each group.
 */
export const CascadeUserDeletionToGroups: Sync = ({ user, group, allGroups }) => ({
  // This sync triggers whenever the deleteUser action successfully completes.
  // The 'user' variable is bound to the ID of the user who was just deleted.
  when: actions(
    [UserAuthentication.deleteUser, {}, { user }],
  ),

  // The 'where' clause finds all groups the deleted user was a member of.
  where: async (frames) => {
    // frames starts as: [{ [user]: "deleted_user_id" }]

    // Query the Groups concept to get a list of all groups for the given user.
    // The '_listGroupsForUser' query returns a single frame containing an array of group IDs.
    // We bind this array to the 'allGroups' variable.
    frames = await frames.query(Groups._listGroupsForUser, { user }, { groups: allGroups });
    // frames is now: [{ [user]: "deleted_user_id", [allGroups]: ["group1_id", "group2_id", ...] }]

    // We use flatMap to transform the single frame into multiple frames, one for each group.
    // This allows the 'then' clause to run once for each group the user needs to leave.
    return frames.flatMap(($) => {
      const groupsArray = $[allGroups] as unknown[]; // Cast to array

      // If the user wasn't in any groups, the array will be empty, and flatMap will produce no output frames.
      if (!groupsArray || groupsArray.length === 0) {
        return [];
      }

      // For each group ID in the array, create a new frame.
      // Each new frame keeps the original bindings (like 'user') and adds a new 'group' binding.
      return groupsArray.map((g) => ({
        ...$,
        [group]: g,
      }));
      // The output will be Frames([ { [user]: ..., [group]: "g1" }, { [user]: ..., [group]: "g2" } ])
    });
  },

  // The 'then' clause is executed for each frame produced by the 'where' clause.
  // It calls the 'leaveGroup' action for the specific user and group in the current frame.
  then: actions(
    [Groups.leaveGroup, { user, group }],
  ),
});
```
