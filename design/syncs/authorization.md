[@implemention-synchronizations](../background/implementing-synchronizations.md)

[@implementation](../concepts/groups/implementation.md)

[@implementation](../concepts/memoryentries/implementation.md)

[@implementation](../concepts/UserAuthentication/implementation.md)

# Prompt: Write the code for these authorization syncs

#### sync AuthorizeGroupInvite

* when
	* Request.inviteMember(user, group, userToInvite)
* where
	* in Groups: user is a member of group
* then
	* Groups.inviteMember(user, group, userToInvite)

#### sync AuthorizeEditMemoryTitle

* when
	* Request.editTitle(user, memory, newTitle)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory
* then
	* MemoryEntries.editTitle(memory, user, newTitle)

#### sync AuthorizeEditMyContributionDescription

* when
	* Request.editContribution(user, memory, newDescription)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user
* then
	* MemoryEntries.editContribution(memory, user, newDescription)

#### sync AuthorizeDeleteMyContribution

* when
	* Request.deleteContribution(user, memory)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user
* then
	* MemoryEntries.deleteContribution(memory, user)

#### sync AuthorizeDeleteMyMemory

* when
	* Request.deleteMemory(user, memory)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND creator of memory_M is user
* then
	* MemoryEntries.deleteMemory(memory, creator: user)

# response:

Of course. Here are the TypeScript implementations for the specified authorization synchronizations, following the established request-response pattern for robust handling of actions and their outcomes.

# file: src/syncs/app.sync.ts

```typescript
//
// Authorization Syncs
//

/**
 * @sync AuthorizeGroupInvite
 * @description Authorizes a user to invite another user to a group.
 * Only group members can invite others to join the group.
 *
 * @spec
 * when
 *   Request.inviteMember(user, group, userToInvite)
 * where
 *   in Groups: user is a member of group
 * then
 *   Groups.inviteMember(user, group, userToInvite)
 */
export const AuthorizeGroupInvite: Sync = ({
  request,
  user,
  group,
  userToInvite,
  members,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/groups/invite", user, group, userToInvite },
    { request },
  ]),
  where: async (frames) => {
    // Query the group details to get the members list
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, {
      members,
    });
    // Filter to keep only frames where the requesting user is in the members list
    return frames.filter(($) => {
      const memberList = $[members] as string[] | undefined;
      const userId = String($[user]);
      return memberList && memberList.includes(userId);
    });
  },
  then: actions(
    [Groups.inviteMember, { user, group, userToInvite }],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Responds to the client upon successful group invite.
 */
export const AuthorizeGroupInviteResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/groups/invite" }, { request }],
    [Groups.inviteMember, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if group invite fails.
 */
export const AuthorizeGroupInviteResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/groups/invite" }, { request }],
    [Groups.inviteMember, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

/**
 * @sync AuthorizeEditMemoryTitle
 * @description Authorizes a user to edit a memory's title.
 * Verifies that the memory exists before allowing the edit.
 *
 * @spec
 * when
 *   Request.editTitle(user, memory, newTitle)
 * where
 *   in MemoryEntries: memory_M exists and memory_M ID is memory
 * then
 *   MemoryEntries.editTitle(memory, user, newTitle)
 */
export const AuthorizeEditMemoryTitle: Sync = ({
  request,
  user,
  memory,
  newTitle,
  memoryDoc,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memories/editTitle", user, memory, newTitle },
    { request },
  ]),
  where: async (frames) => {
    // Query to verify the memory exists
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // Filter to keep only frames where the memory exists
    return frames.filter(($) => $[memoryDoc]);
  },
  then: actions(
    [MemoryEntries.editTitle, { memory, user, newTitle }],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Responds to the client upon successful memory title edit.
 */
export const AuthorizeEditMemoryTitleResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/memories/editTitle" }, { request }],
    [MemoryEntries.editTitle, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if memory title edit fails.
 */
export const AuthorizeEditMemoryTitleResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/memories/editTitle" }, { request }],
    [MemoryEntries.editTitle, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

/**
 * @sync AuthorizeEditMyContributionDescription
 * @description Authorizes a user to edit their own contribution description.
 * Verifies that the memory exists and the user has a contribution in that memory.
 *
 * @spec
 * when
 *   Request.editContribution(user, memory, newDescription)
 * where
 *   in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user
 * then
 *   MemoryEntries.editContribution(memory, user, newDescription)
 */
export const AuthorizeEditMyContributionDescription: Sync = ({
  request,
  user,
  memory,
  newDescription,
  memoryDoc,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/contributions/edit", user, memory, newDescription },
    { request },
  ]),
  where: async (frames) => {
    // Define expected shapes for type safety
    type Contribution = { user: string; description: string; imageUrls: string[] };
    type MemoryDoc = { contributions: Contribution[] };

    // Query to get the memory document
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // Filter to ensure the memory exists and contains a contribution from the user
    return frames.filter(($) => {
      const doc = $[memoryDoc] as MemoryDoc | undefined;
      const userToFind = $[user] as string;

      return doc &&
        doc.contributions.some((c) => c.user === userToFind);
    });
  },
  then: actions(
    [MemoryEntries.editContribution, { memory, user, newDescription }],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Responds to the client upon successful contribution description edit.
 */
export const AuthorizeEditMyContributionDescriptionResponse: Sync = ({
  request,
}) => ({
  when: actions(
    [Requesting.request, { path: "/contributions/edit" }, { request }],
    [MemoryEntries.editContribution, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if contribution description edit fails.
 */
export const AuthorizeEditMyContributionDescriptionResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/contributions/edit" }, { request }],
    [MemoryEntries.editContribution, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

/**
 * @sync AuthorizeDeleteMyContribution
 * @description Authorizes a user to delete their own contribution.
 * Verifies that the memory exists and the user has a contribution in that memory.
 *
 * @spec
 * when
 *   Request.deleteContribution(user, memory)
 * where
 *   in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user
 * then
 *   MemoryEntries.deleteContribution(memory, user)
 */
export const AuthorizeDeleteMyContribution: Sync = ({
  request,
  user,
  memory,
  memoryDoc,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/contributions/delete", user, memory },
    { request },
  ]),
  where: async (frames) => {
    // Define expected shapes for type safety
    type Contribution = { user: string; description: string; imageUrls: string[] };
    type MemoryDoc = { contributions: Contribution[] };

    // Query to get the memory document
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // Filter to ensure the memory exists and contains a contribution from the user
    return frames.filter(($) => {
      const doc = $[memoryDoc] as MemoryDoc | undefined;
      const userToFind = $[user] as string;

      return doc &&
        doc.contributions.some((c) => c.user === userToFind);
    });
  },
  then: actions(
    [MemoryEntries.deleteContribution, { memory, user }],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Responds to the client upon successful contribution deletion.
 */
export const AuthorizeDeleteMyContributionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/contributions/delete" }, { request }],
    [MemoryEntries.deleteContribution, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if contribution deletion fails.
 */
export const AuthorizeDeleteMyContributionResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/contributions/delete" }, { request }],
    [MemoryEntries.deleteContribution, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

/**
 * @sync AuthorizeDeleteMyMemory
 * @description Authorizes a user to delete a memory they created.
 * Verifies that the memory exists and the user is the creator.
 *
 * @spec
 * when
 *   Request.deleteMemory(user, memory)
 * where
 *   in MemoryEntries: memory_M exists and memory_M ID is memory AND creator of memory_M is user
 * then
 *   MemoryEntries.deleteMemory(memory, creator: user)
 */
export const AuthorizeDeleteMyMemory: Sync = ({
  request,
  user,
  memory,
  memoryDoc,
  creator,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memories/delete", user, memory },
    { request },
  ]),
  where: async (frames) => {
    // Query to get the memory document and extract the creator
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // Extract creator from memory document and bind it
    frames = frames.map(($) => ({
      ...$,
      [creator]: ($[memoryDoc] as { creator: string }).creator,
    }));
    // Filter to ensure the memory exists and the creator matches the requesting user
    return frames.filter(($) => {
      const doc = $[memoryDoc];
      const creatorId = String($[creator]);
      const userId = String($[user]);
      return doc && creatorId === userId;
    });
  },
  then: actions(
    [MemoryEntries.deleteMemory, { memory, creator: user }],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Responds to the client upon successful memory deletion.
 */
export const AuthorizeDeleteMyMemoryResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/memories/delete" }, { request }],
    [MemoryEntries.deleteMemory, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if memory deletion fails.
 */
export const AuthorizeDeleteMyMemoryResponseError: Sync = ({
  request,
  error,
}) => ({
  when: actions(
    [Requesting.request, { path: "/memories/delete" }, { request }],
    [MemoryEntries.deleteMemory, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
```

