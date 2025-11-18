## Groups

### Purpose
To provide a collaborative space where users can form groups, manage membership, and participate in shared memory creation

### Principle
* Users can create groups, invite friends to join, and manage group membership collectively.
* Each group maintains a name and a list of members, allowing users to collaborate on shared content such as memory boards.
* Invitations ensure that group membership is controlled and consensual.
* Only group members can edit group details or participate in group activities, and users can choose to leave a group at any time.
* Deleting any group member should be democratic

### State
* A set of Groups with
    * A group ID String
    * A group Name String
    * A set of members Users
    *  A set of invitedMembers Users
* A set of RemovalVotes with
    * An associated group by ID String
    * A flagged user User
    * A set of proponents Set<User>
    * A start time Date

### Actions
#### createGroup(user: User, name: String): (group: Group)
* Requires: user to exist
* Effects: creates a new group with the user as a member of the group, the parameter name, and a randomly generated unique ID

#### editGroupName(user: User, group: Group, new_name: String)
* Requires: user and group to exist, user to be a member within the group
* Effects: if new_name is empty, changes group name to be a list of the member names separated by comma. Otherwise, changes group name to be the parameter name.

#### inviteMember(user: User, group: Group, userToInvite: User)
* Requires: user + userToAdd + group to all exist, user to exist in the group, userToInvite to not already be within the group
* Effects: sends an invitation to the group to userToInvite

#### acceptInvitation(user: User, group: Group)
* Requires: User and group exist, User has been invited to group
* Effects: User is added to group

#### declineInvitation(user: User, group: Group)
* Requires: user and group to exist, user has been invited to group
* Effects: user is not added to group, invitation becomes void

#### leaveGroup(user: User, group: Group)
* Requires: user and group to exist, user to be a member of the group
* Effects: removes user from the list of members of the group

#### proposeRemoval(user: User, group: Group, flagged_user: User): (vote: RemovalVote)
* Requires: user + group + flagged_user all exist, user and flagged_user are distinct, user and flagged_user are both in the group, removal vote does not already exist for the flagged_user
* Effects: create a removal vote on the flagged_user with an empty set of proponents and the current time marked in the timestamp

#### voteRemoval(user: User, vote: RemovalVote)
* Requires: user + group + flagged_user all exist, user and flagged_user are distinct, user and flagged_user are both in the group, removal vote exists for the flagged_user
* Effects: list the user in the set of proponents for the vote. If the size of the set of proponents is at least 51% of the size of the total group, remove flagged_user (listed in vote) from the group and delete the vote.

#### voteExpire(vote: RemovalVote)
* Requires: vote to exist, current time is at least 24 hours after the start date of the vote
* Effects: removes the vote from the list of RemovalVotes of the group

#### deleteGroup(group: Group)
* Requires: group to exist. Requires Group to have no more members and no invited members.
* Effects: removes the group from set of Groups
