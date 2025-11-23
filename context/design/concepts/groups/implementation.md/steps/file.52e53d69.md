---
timestamp: 'Sat Nov 22 2025 13:36:32 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251122_133632.9bb2f456.md]]'
content_id: 52e53d69e68cebd647cb7e351ba380b6caeb6ce03be91aa7f52d3741cd44ff2d
---

# file: src/concepts/Groups/GroupsConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";

// Collection prefix
const PREFIX = "Groups" + ".";

// Generic types
type User = ID;
type Group = ID;
type RemovalVote = ID;

/**
 * A set of Groups with
 *  A group ID String
 *  A group Name String
 *  A set of members Users
 *  A set of invitedMembers Users
 */
interface GroupDoc {
  _id: Group;
  name: string;
  members: User[];
  invitedMembers: User[];
}

/**
 * A set of RemovalVotes with
 *  An associated group by ID String
 *  A flagged user User
 *  A set of proponents Set<User>
 *  A start time Date
 */
interface RemovalVoteDoc {
  _id: RemovalVote;
  group: Group;
  flaggedUser: User;
  proponents: User[];
  startTime: Date;
}

/**
 * @concept Groups
 * @purpose To provide a collaborative space where users can form groups and manage membership
 * @principle
 * - Users can create groups, invite friends to join, and manage group membership collectively.
 * - Each group maintains a name and a list of members, allowing users to collaborate on shared content
 * - Invitations ensure that group membership is controlled and consensual.
 * - Only group members can edit group details or participate in group activities, and users can choose to leave a group at any time.
 * - Deleting any group member follows a democratic process
 */
export default class GroupsConcept {
  groups: Collection<GroupDoc>;
  removalVotes: Collection<RemovalVoteDoc>;

  constructor(private readonly db: Db) {
    this.groups = this.db.collection(PREFIX + "groups");
    this.removalVotes = this.db.collection(PREFIX + "removalVotes");
  }

  /**
   * createGroup(user: User, name: String): (group: Group)
   *
   * @requires user to exist
   * @effects creates a new group with the user as a member of the group and a randomly generated unique ID.
   *          If name is empty, changes group name to be a list of the member names separated by comma.
   *          Otherwise, changes group name to be the parameter name.
   */
  async createGroup({ user, name }: { user: User; name: string }): Promise<{ group: Group } | { error: string }> {
    console.log(user, name);
    return { error: "Not implemented" };
  }

  /**
   * editGroupName(user: User, group: Group, new_name: String)
   *
   * @requires user and group to exist, user to be a member within the group
   * @effects if new_name is empty, changes group name to be a list of the member names separated by comma.
   *          Otherwise, changes group name to be the parameter name.
   */
  async editGroupName({ user, group, new_name }: { user: User; group: Group; new_name: string }): Promise<Empty | { error: string }> {
    console.log(user, group, new_name);
    return { error: "Not implemented" };
  }

  /**
   * inviteMember(user: User, group: Group, userToInvite: User)
   *
   * @requires user + userToInvite + group to all exist, user to exist in the group, userToInvite to not already be a member or invited member of the group
   * @effects sends an invitation to the group to userToInvite
   */
  async inviteMember({ user, group, userToInvite }: { user: User; group: Group; userToInvite: User }): Promise<Empty | { error: string }> {
    console.log(user, group, userToInvite);
    return { error: "Not implemented" };
  }

  /**
   * acceptInvitation(user: User, group: Group)
   *
   * @requires user and group to exist, user has been invited to group
   * @effects user is removed from list of invited members of the group, user is added to group as a member
   */
  async acceptInvitation({ user, group }: { user: User; group: Group }): Promise<Empty | { error: string }> {
    console.log(user, group);
    return { error: "Not implemented" };
  }

  /**
   * declineInvitation(user: User, group: Group)
   *
   * @requires user and group to exist, user has been invited to group
   * @effects user is removed from list of invited members of the group
   */
  async declineInvitation({ user, group }: { user: User; group: Group }): Promise<Empty | { error: string }> {
    console.log(user, group);
    return { error: "Not implemented" };
  }

  /**
   * leaveGroup(user: User, group: Group)
   *
   * @requires user and group to exist, user to be a member of the group
   * @effects removes user from the list of members of the group
   */
  async leaveGroup({ user, group }: { user: User; group: Group }): Promise<Empty | { error: string }> {
    console.log(user, group);
    return { error: "Not implemented" };
  }

  /**
   * deleteGroup(group: Group)
   *
   * @requires group to exist. Requires group to have no more members and no invited members.
   * @effects removes the group from set of Groups
   */
  async deleteGroup({ group }: { group: Group }): Promise<Empty | { error: string }> {
    console.log(group);
    return { error: "Not implemented" };
  }

  /**
   * _getGroupDetails (groupID: String): (groupName: String, members: Set<User>, invitedMembers: Set<User>)
   *
   * @requires group associated with groupID exists.
   * @effects Returns the details of the specified group.
   */
  async _getGroupDetails({ groupID }: { groupID: string }): Promise<{ groupName: string; members: User[]; invitedMembers: User[] }[]> {
    console.log(groupID);
    throw new Error("Not implemented");
  }

  /**
   * _listGroupsForUser (user: User): (groups: Set<Group>)
   *
   * @requires user exists.
   * @effects Returns a set of groups that the user is a member of.
   */
  async _listGroupsForUser({ user }: { user: User }): Promise<{ group: Group }[]> {
    console.log(user);
    throw new Error("Not implemented");
  }
}
```
