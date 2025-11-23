import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Groups" + ".";

// Generic types of this concept
type User = ID;
type Group = ID;

/**
 * @concept Groups
 * @purpose To provide a collaborative space where users can form groups and manage membership.
 * @principle Users can create groups, invite friends to join, and manage group membership collectively. Each group maintains a name and a list of members, allowing users to collaborate on shared content. Invitations ensure that group membership is controlled and consensual. Only group members can edit group details or participate in group activities, and users can choose to leave a group at any time. Deleting any group member follows a democratic process.
 */

/**
 * A set of Groups with
 * - A group ID String (mapped to _id)
 * - A group Name String
 * - A set of members Users
 * - A set of invitedMembers Users
 */
interface GroupDoc {
  _id: Group;
  name: string;
  members: User[];
  invitedMembers: User[];
}

export default class GroupsConcept {
  public readonly groups: Collection<GroupDoc>;

  constructor(private readonly db: Db) {
    this.groups = this.db.collection(PREFIX + "groups");
  }

  /**
   * createGroup(user: User, name: String): (group: Group)
   *
   * @requires user to exist
   * @effects creates a new group with the user as a member of the group and a randomly generated unique ID. If name is empty, changes group name to be a list of the member names separated by comma. Otherwise, changes group name to be the parameter name.
   */
  async createGroup(
    { user, name }: { user: User; name: string },
  ): Promise<{ group: Group } | { error: string }> {
    // Note: The 'user exists' requirement cannot be checked within this concept, as it has no knowledge of User documents.
    // This must be enforced by the calling context or a dedicated User concept.

    const groupID = freshID() as Group;

    // Per spec, if name is empty, it should be a list of member names.
    // At creation, there is only one member. This concept does not know user names, so we use the user ID.
    const groupName = name.trim() === "" ? user : name;

    const newGroup: GroupDoc = {
      _id: groupID,
      name: groupName,
      members: [user],
      invitedMembers: [],
    };

    try {
      const result = await this.groups.insertOne(newGroup);
      if (!result.acknowledged) {
        return { error: "Database operation failed: could not create group." };
      }
      return { group: groupID };
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while creating group: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while creating group." };
    }
  }

  /**
   * editGroupName(user: User, group: Group, new_name: String)
   *
   * @requires user and group to exist, user to be a member within the group
   * @effects if new_name is empty, changes group name to be a list of the member names separated by comma. Otherwise, changes group name to be the parameter name.
   */
  async editGroupName(
    { user, group, new_name }: { user: User; group: Group; new_name: string },
  ): Promise<Empty | { error: string }> {
    // @ts-ignore: unused
    const _ = { user, group, new_name };
    return await Promise.resolve({ error: "Not implemented" });
  }

  /**
   * inviteMember(user: User, group: Group, userToInvite: User)
   *
   * @requires user, userToInvite, and group to all exist, user to exist in the group, userToInvite to not already be a member or invited member of the group
   * @effects sends an invitation to the group to userToInvite
   */
  async inviteMember(
    { user, group, userToInvite }: {
      user: User;
      group: Group;
      userToInvite: User;
    },
  ): Promise<Empty | { error: string }> {
    try {
      // First, check requirements by fetching the group document.
      const groupDoc = await this.groups.findOne({ _id: group });

      if (!groupDoc) {
        return { error: `Group not found.` };
      }

      if (!groupDoc.members.includes(user)) {
        return {
          error: "Permission denied: Only group members can invite others.",
        };
      }

      if (groupDoc.members.includes(userToInvite)) {
        return { error: "User is already a member of the group." };
      }

      if (groupDoc.invitedMembers.includes(userToInvite)) {
        // Invitation already exists, which is not an error. The requirement is met.
        return {};
      }

      // If all checks pass, perform the update.
      const result = await this.groups.updateOne({ _id: group }, {
        $addToSet: { invitedMembers: userToInvite },
      });

      if (!result.acknowledged || result.modifiedCount === 0) {
        // The modifiedCount check handles race conditions where an invite might have been added
        // between our findOne and updateOne calls. If so, we can re-check and return success if the invite exists.
        const updatedGroupDoc = await this.groups.findOne({ _id: group });
        if (updatedGroupDoc?.invitedMembers.includes(userToInvite)) {
          return {};
        }
        return { error: "Database operation failed: could not invite member." };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while inviting member: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while inviting member." };
    }
  }

  /**
   * acceptInvitation(user: User, group: Group)
   *
   * @requires user and group to exist, user has been invited to group
   * @effects user is removed from list of invited members of the group, user is added to group as a member
   */
  async acceptInvitation(
    { user, group }: { user: User; group: Group },
  ): Promise<Empty | { error: string }> {
    try {
      const groupDoc = await this.groups.findOne({ _id: group });
      if (!groupDoc) {
        return { error: "Group not found." };
      }

      if (!groupDoc.invitedMembers.includes(user)) {
        return { error: "User has not been invited to this group." };
      }

      const result = await this.groups.updateOne({ _id: group }, {
        $pull: { invitedMembers: user },
        $addToSet: { members: user },
      });

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not accept invitation.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while accepting invitation: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while accepting invitation." };
    }
  }

  /**
   * declineInvitation(user: User, group: Group)
   *
   * @requires user and group to exist, user has been invited to group
   * @effects user is removed from list of invited members of the group
   */
  async declineInvitation(
    { user, group }: { user: User; group: Group },
  ): Promise<Empty | { error: string }> {
    try {
      const groupDoc = await this.groups.findOne({ _id: group });
      if (!groupDoc) {
        return { error: "Group not found." };
      }

      if (!groupDoc.invitedMembers.includes(user)) {
        return { error: "User has not been invited to this group." };
      }

      const result = await this.groups.updateOne({ _id: group }, {
        $pull: { invitedMembers: user },
      });

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not decline invitation.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while declining invitation: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while declining invitation." };
    }
  }

  /**
   * leaveGroup(user: User, group: Group)
   *
   * @requires user and group to exist, user to be a member of the group
   * @effects removes user from the list of members of the group
   */
  async leaveGroup(
    { user, group }: { user: User; group: Group },
  ): Promise<Empty | { error: string }> {
    // @ts-ignore: unused
    const _ = { user, group };
    return await Promise.resolve({ error: "Not implemented" });
  }

  /**
   * deleteGroup(group: Group)
   *
   * @requires group to exist. Requires group to have no more members and no invited members.
   * @effects removes the group from set of Groups
   */
  async deleteGroup(
    { group }: { group: Group },
  ): Promise<Empty | { error: string }> {
    // @ts-ignore: unused
    const _ = { group };
    return await Promise.resolve({ error: "Not implemented" });
  }

  /**
   * _getGroupDetails (groupID: String): (groupName: String, members: Set<User>, invitedMembers: Set<User>)
   *
   * @requires group associated with groupID exists.
   * @effects Returns the details of the specified group.
   */
  async _getGroupDetails(
    { groupID }: { groupID: string },
  ): Promise<
    Array<{ groupName: string; members: User[]; invitedMembers: User[] }>
  > {
    try {
      const groupDoc = await this.groups.findOne({ _id: groupID as Group });

      if (!groupDoc) {
        return [];
      }

      return [
        {
          groupName: groupDoc.name,
          members: groupDoc.members,
          invitedMembers: groupDoc.invitedMembers,
        },
      ];
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(
          `Database query failed in _getGroupDetails: ${e.message}`,
        );
      }
      throw new Error(
        "An unknown database error occurred in _getGroupDetails.",
      );
    }
  }

  /**
   * _listGroupsForUser (user: User): (groups: Set<Group>)
   *
   * @requires user exists.
   * @effects Returns a set of groups that the user is a member of.
   */
  async _listGroupsForUser(
    { user }: { user: User },
  ): Promise<Array<{ groups: Group[] }>> {
    try {
      const userGroups = await this.groups.find({ members: user }).toArray();
      const groupIds = userGroups.map((group) => group._id);

      return [{ groups: groupIds }];
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(
          `Database query failed in _listGroupsForUser: ${e.message}`,
        );
      }
      throw new Error(
        "An unknown database error occurred in _listGroupsForUser.",
      );
    }
  }
}
