---
timestamp: 'Sat Nov 22 2025 13:36:32 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251122_133632.9bb2f456.md]]'
content_id: dbe36f6ad151bcf6e14efda4e26b629721bd18d01860cbba5eb07806d660e830
---

# concept: Groups

* **purpose**: To provide a collaborative space where users can form groups and manage membership
* **principle**:
  * Users can create groups, invite friends to join, and manage group membership collectively.
  * Each group maintains a name and a list of members, allowing users to collaborate on shared content
  * Invitations ensure that group membership is controlled and consensual.
  * Only group members can edit group details or participate in group activities, and users can choose to leave a group at any time.
  * Deleting any group member follows a democratic process
* **state**:
  * A set of Groups with
    * A group ID String
    * A group Name String
    * A set of members Users
    * A set of invitedMembers Users
  * A set of RemovalVotes with
    * An associated group by ID String
    * A flagged user User
    * A set of proponents Set<User>
    * A start time Date
* **actions**:
  * **createGroup(user: User, name: String): (group: Group)**
    * Requires: user to exist
    * Effects: creates a new group with the user as a member of the group and a randomly generated unique ID. If name is empty, changes group name to be a list of the member names separated by comma. Otherwise, changes group name to be the parameter name.
  * **editGroupName(user: User, group: Group, new\_name: String)**
    * Requires: user and group to exist, user to be a member within the group
    * Effects: if new\_name is empty, changes group name to be a list of the member names separated by comma. Otherwise, changes group name to be the parameter name.
  * **inviteMember(user: User, group: Group, userToInvite: User)**
    * Requires: user + userToAdd + group to all exist, user to exist in the group, userToInvite to not already be a member or invited member of the group
    * Effects: sends an invitation to the group to userToInvite
  * **acceptInvitation(user: User, group: Group)**
    * Requires: user and group to exist, user has been invited to group
    * Effects: user is removed from list of invited members of the group, user is added to group as a member
  * **declineInvitation(user: User, group: Group)**
    * Requires: user and group to exist, user has been invited to group
    * Effects: user is removed from list of invited members of the group
  * **leaveGroup(user: User, group: Group)**
    * Requires: user and group to exist, user to be a member of the group
    * Effects: removes user from the list of members of the group
  * **deleteGroup(group: Group)**
    * Requires: group to exist. Requires group to have no more members and no invited members.
    * Effects: removes the group from set of Groups
* **queries**:
  * **\_getGroupDetails (groupID: String): (groupName: String, members: Set<User>, invitedMembers: Set<User>)**
    * Requires: group associated with groupID exists.
    * Effects: Returns the details of the specified group.
  * **\_listGroupsForUser (user: User): (groups: Set<Group>)**
    * Requires: user exists.
    * Effects: Returns a set of groups that the user is a member of.
