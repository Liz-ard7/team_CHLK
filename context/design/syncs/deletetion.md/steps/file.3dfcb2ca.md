---
timestamp: 'Sat Nov 29 2025 15:58:14 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_155814.1ff44a78.md]]'
content_id: 3dfcb2ca426c82e37f8d5ac7d9af76eaf921211520e466a295c1502667fb728d
---

# file: src/syncs/user/CascadeUserDeletionToGroups.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { UserAuthentication, Groups } from "@concepts";

/**
 * @sync CascadeUserDeletionToGroups
 * @description When a user is deleted, this synchronization finds all the groups they are a member of
 * and triggers the `leaveGroup` action for each of those groups.
 *
 * @spec
 * when
 *   UserAuthentication.deleteUser () : (user)
 * where
 *   in Groups: _listGroupsForUser(user) gets groups
 * then
 *   Groups.leaveGroup (user, group)
 */
export const CascadeUserDeletionToGroups: Sync = ({ user, group, groupList }) => ({
  when: actions(
    // The `deleteUser` action returns the ID of the deleted user.
    // We bind this ID to the `user` variable.
    [UserAuthentication.deleteUser, {}, { user }],
  ),
  where: async (frames) => {
    // For each deleted user, find all groups they are a member of.
    // The `_listGroupsForUser` query returns a single frame with a `groupList` variable containing an array of group IDs.
    // e.g., frames starts as: [{ [user]: "user_id" }]
    frames = await frames.query(Groups._listGroupsForUser, { user }, { groups: groupList });
    // e.g., frames is now: [{ [user]: "user_id", [groupList]: ["group_1", "group_2"] }]

    // We need to "unwind" this list to create a separate frame for each group,
    // so the `then` clause can fire once per group.
    return frames.flatMap(($) => {
      const groupsForUser = $[groupList] as unknown[]; // The array of group IDs

      // If the user is not in any groups, the query might return an empty list.
      // In that case, we return an empty array of frames, and the `then` clause does not fire.
      if (!groupsForUser || groupsForUser.length === 0) {
        return [];
      }

      // Create a new frame for each group ID, binding it to the `group` variable.
      return groupsForUser.map((g) => ({
        ...$, // Keep original bindings (e.g., `user`)
        [group]: g, // Add the `group` binding for the current group
      }));
      // e.g., the final frames will be:
      // [
      //   { [user]: "user_id", [groupList]: [...], [group]: "group_1" },
      //   { [user]: "user_id", [groupList]: [...], [group]: "group_2" }
      // ]
    });
  },
  then: actions(
    // For each frame produced by the `where` clause, fire the `leaveGroup` action
    // with the corresponding `user` and `group` bindings.
    [Groups.leaveGroup, { user, group }],
  ),
});
```
