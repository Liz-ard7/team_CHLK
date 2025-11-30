import {
  Groups,
  ImageStorage,
  MemoryEntries,
  Requesting,
  UserAuthentication,
} from "@concepts";
import { actions, Frames, Sync } from "@engine";
import type { Frame } from "../engine/frames.ts";
import { ID } from "@utils/types.ts";

/**
 * Sync: UpdateProfilePhotoOnUpload
 *
 * When a user confirms a profile photo upload, update their user profile.
 *
 * Note: Includes a Trigger sync to initiate the ImageStorage action from the Request.
 */
export const TriggerProfilePhotoConfirm: Sync = ({
  request,
  user,
  object,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/users/changePhoto", user, object },
    { request },
  ]),
  then: actions([ImageStorage.confirmUpload, { user, object }]),
});

export const UpdateProfilePhotoOnUpload: Sync = ({
  request,
  user,
  object,
  url,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/changePhoto", user, object },
      { request },
    ],
    [ImageStorage.confirmUpload, { user, object }, { url }],
  ),
  then: actions(
    [UserAuthentication.changePhoto, { user, new_photo: url }],
    [Requesting.respond, { request, url }],
  ),
});

/**
 * Sync: AddImageToMemoryAfterUploadConfirmation
 *
 * When an image upload is confirmed in the context of a specific memory,
 * add that image to the memory's contribution.
 *
 * Note: We use the path "/memory-images/confirm" to semantically represent
 * the confirmation step, rather than the "/upload-url" path which initiates
 * the process.
 */
export const TriggerMemoryImageConfirm: Sync = ({
  request,
  user,
  object,
  memory,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memory-images/confirm", user, object, memory },
    { request },
  ]),
  then: actions([ImageStorage.confirmUpload, { user, object }]),
});

export const AddImageToMemoryAfterUploadConfirmation: Sync = ({
  request,
  user,
  object,
  memory,
  url,
}) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/memory-images/confirm", user, object, memory },
      { request },
    ],
    [ImageStorage.confirmUpload, { user, object }, { url }],
  ),
  then: actions(
    [MemoryEntries.addImage, { memory, user, imageUrl: url }],
    [
      Requesting.respond,
      { request, status: "success", imageUrl: url },
    ],
  ),
});

/**
 * Sync: AuthorizeMemoryCreation
 *
 * Only allow memory creation if the user is a member of the target group.
 */
export const AuthorizeMemoryCreation: Sync = ({
  request,
  user,
  group,
  title,
  memory,
  members,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memories/create", user, group, title },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, {
      members,
    });
    // Filter frames where the user is in the members list
    return frames.filter((f) => {
      const memberList = f[members] as string[];
      const userId = String(f[user]);
      return memberList.includes(userId);
    });
  },
  then: actions(
    [MemoryEntries.createMemory, { creator: user, group, title }, { memory }],
    [Requesting.respond, { request, memory }],
  ),
});

/**
 * Sync: AuthorizeAddContributionAsGroupMember
 *
 * Allow adding a contribution only if the user belongs to the group
 * that owns the memory.
 */
export const AuthorizeAddContributionAsGroupMember: Sync = ({
  request,
  user,
  memory,
  description,
  imageUrls,
  memoryObj,
  members,
  group,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/contributions/add", user, memory, description, imageUrls },
    { request },
  ]),
  where: async (frames) => {
    // 1. Get the memory object to find out which group it belongs to
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      {
        memoryObj,
      },
    );

    if (frames.length === 0) return frames;

    // 2. Extract the group ID from the memory object and bind it to the group symbol
    const framesWithGroup = new Frames(...frames.map((f) => {
      // deno-lint-ignore no-explicit-any
      const mem = f[memoryObj] as any;
      return { ...f, [group]: mem?.group } as Frame;
    }));

    // 3. Query the group details using the bound group symbol
    const nextFrames = await framesWithGroup.query(
      Groups._getGroupDetails,
      { groupID: group },
      { members },
    );

    // 4. Filter for membership
    return nextFrames.filter((f) => {
      const memberList = f[members] as string[];
      const userId = String(f[user]);
      return memberList.includes(userId);
    });
  },
  then: actions(
    [
      MemoryEntries.addContribution,
      { memory, user, description, imageUrls },
    ],
    [Requesting.respond, { request, status: "success" }],
  ),
});

/**
 * Sync: CascadeUserDeletionToContributions
 *
 * When a user is deleted, remove all their contributions from memories
 * across all groups they belonged to.
 */
export const CascadeUserDeletionToContributions: Sync = ({
  user,
  groups,
  memories,
  memoryObj,
  currentGroup,
  currentMemory,
}) => ({
  when: actions([UserAuthentication.deleteUser, {}, { user }]),
  where: async (frames) => {
    // 1. Find all groups the user belongs to
    frames = await frames.query(Groups._listGroupsForUser, { user }, {
      groups,
    });

    // 2. Expand the list of groups into individual frames
    const groupFrames = [];
    for (const frame of frames) {
      const groupList = frame[groups] as string[];
      if (groupList) {
        for (const gid of groupList) {
          groupFrames.push({ ...frame, [currentGroup]: gid } as Frame);
        }
      }
    }
    let f2 = new Frames(...groupFrames);

    // 3. Find all memories in those groups
    f2 = await f2.query(
      MemoryEntries._listMemoriesForGroup,
      { groupID: currentGroup },
      { memories },
    );

    // 4. Expand the list of memories into individual frames
    const memoryFrames = [];
    for (const frame of f2) {
      const memoryList = frame[memories] as string[];
      if (memoryList) {
        for (const mid of memoryList) {
          memoryFrames.push({ ...frame, [currentMemory]: mid } as Frame);
        }
      }
    }
    let f3 = new Frames(...memoryFrames);

    // 5. Get full details of each memory to check contributions
    f3 = await f3.query(
      MemoryEntries._getMemory,
      { memoryID: currentMemory },
      { memoryObj },
    );

    // 6. Filter memories to only those where this user has a contribution
    return f3.filter((f) => {
      // deno-lint-ignore no-explicit-any
      const mem = f[memoryObj] as any;
      if (!mem || !mem.contributions) return false;
      // deno-lint-ignore no-explicit-any
      return mem.contributions.some((c: any) => c.user === f[user]);
    });
  },
  then: actions(
    [
      MemoryEntries.deleteContribution,
      { memory: currentMemory, user },
    ],
  ),
});

// Calvin's Syncs

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
export const CascadeUserDeletionToGroups: Sync = (
  { user, group, groupList },
) => ({
  when: actions(
    // The `deleteUser` action returns the ID of the deleted user.
    // We bind this ID to the `user` variable.
    [UserAuthentication.deleteUser, {}, { user }],
  ),
  where: async (frames) => {
    // For each deleted user, find all groups they are a member of.
    // The `_listGroupsForUser` query returns a single frame with a `groupList` variable containing an array of group IDs.
    // e.g., frames starts as: [{ [user]: "user_id" }]
    frames = await frames.query(Groups._listGroupsForUser, { user }, {
      groups: groupList,
    });
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
export const DeleteEmptyGroup: Sync = (
  { user, group, members, invitedMembers },
) => ({
  when: actions(
    [Groups.leaveGroup, { user, group }, {}],
  ),
  where: async (frames) => {
    // For each group that a user just left, get its current list of members and invited members.
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, {
      members,
      invitedMembers,
    });
    // Filter to keep only the frames for groups that are now completely empty.
    // We must cast the values from the frame (which are `unknown`) to an array type to access .length.
    return frames.filter(($) =>
      ($[members] as unknown[]).length === 0 &&
      ($[invitedMembers] as unknown[]).length === 0
    );
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
export const CascadeGroupDeletionToMemories: Sync = (
  { group, memory, creator, memoryList },
) => ({
  when: actions(
    [Groups.deleteGroup, { group }, {}],
  ),
  where: async (frames) => {
    // 1. Query for the list of memories. This returns a single frame where `memoryList` is an array of memory IDs.
    const framesWithList = await frames.query(
      MemoryEntries._listMemoriesForGroup,
      { groupID: group },
      { memories: memoryList },
    );

    // 2. Expand the single frame into multiple frames, one for each memory ID in the list.
    const expandedFrames = framesWithList.flatMap(($) => {
      const memories = $[memoryList] as ID[]; // Assert the type to an array of IDs
      if (!memories || memories.length === 0) {
        return []; // No memories, so no frames to generate.
      }
      // Create a new frame object for each memory, carrying over existing bindings like `group`.
      return memories.map((memID) => ({
        ...$,
        [memory]: memID, // Bind the single `memory` variable for the next query
      }));
    });

    // If no memories were found, return an empty set of frames to halt the synchronization.
    if (expandedFrames.length === 0) {
      return new Frames();
    }

    // 3. Create a new Frames instance and query for the creator of each individual memory.
    let perMemoryFrames = new Frames(...expandedFrames);
    perMemoryFrames = await perMemoryFrames.query(MemoryEntries._getMemory, {
      memoryID: memory,
    }, { creator });

    return perMemoryFrames;
  },
  then: actions(
    // The `then` clause will now fire once for each frame produced by the `where` clause.
    [MemoryEntries.deleteMemory, { memory, creator }],
  ),
});

/**
 * Authorizes and initiates a request for a secure image upload URL.
 *
 * This sync triggers when a request is made to `/memory-images/upload-url`.
 * It verifies that the requesting user is a member of the group associated with the memory
 * before proceeding to call the ImageStorage concept to generate the URL.
 */
export const RequestMemoryImageUploadUrl: Sync = ({
  request,
  user,
  memory,
  filename,
  contentType,
  memoryDoc,
  group,
  members,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memory-images/upload-url", user, memory, filename, contentType },
    { request },
  ]),
  where: async (frames) => {
    // 1. Find the memory to get its associated group ID.
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // 2. Filter out requests where the memory doesn't exist.
    frames = frames.filter(($) => $[memoryDoc]);
    // 3. Extract the group ID from the memory document and add it to the frame.
    frames = frames.map(($) => ({
      ...$,
      [group]: ($[memoryDoc] as { group: string }).group,
    }));
    // 4. Get the list of members for that group.
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, {
      members,
    });
    // 5. Authorize by keeping only frames where the requesting user is in the member list.
    return frames.filter(($) => {
      const memberList = $[members] as string[] | undefined;
      return memberList && memberList.includes($[user] as string);
    });
  },
  then: actions([
    ImageStorage.requestUploadUrl,
    { user, filename, contentType },
  ]),
});

/**
 * Responds to the client with the generated upload URL upon successful creation.
 *
 * This sync matches a completed `ImageStorage.requestUploadUrl` action with its
 * originating request within the same flow and sends the URL details back to the client.
 */
export const RequestMemoryImageUploadUrlResponse: Sync = ({
  request,
  user,
  memory,
  uploadUrl,
  bucket,
  object,
}) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/upload-url", user, memory }, {
      request,
    }],
    [ImageStorage.requestUploadUrl, {}, { uploadUrl, bucket, object }],
  ),
  then: actions([
    Requesting.respond,
    { request, uploadUrl, bucket, object, memory, user },
  ]),
});

/**
 * Responds to the client with an error if URL generation fails.
 *
 * This sync handles the error case for `ImageStorage.requestUploadUrl` and
 * sends the error message back to the client.
 */
export const RequestMemoryImageUploadUrlResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/upload-url" }, { request }],
    [ImageStorage.requestUploadUrl, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});

//
// Syncs for Deleting an Image from a Memory Contribution
//

/**
 * Authorizes and initiates a request to delete an image from a memory.
 *
 * This sync triggers on a request to delete an image. It verifies that the requesting user
 * is the owner of the contribution containing the image before calling the action to delete it.
 */
export const AuthorizeDeleteImageFromMemoryRequest: Sync = ({
  request,
  user,
  memory,
  imageUrl,
  memoryDoc,
}) => ({
  when: actions([
    Requesting.request,
    { path: "/memory-images/delete", user, memory, imageUrl },
    { request },
  ]),
  where: async (frames) => {
    // Define expected shapes for type safety
    type Contribution = { user: string; imageUrls: string[] };
    type MemoryDoc = { contributions: Contribution[] };

    // 1. Fetch the memory document.
    frames = await frames.query(
      MemoryEntries._getMemory,
      { memoryID: memory },
      { memory: memoryDoc },
    );
    // 2. Authorize by ensuring the memory exists and contains a contribution from the user
    //    that includes the specified image URL.
    return frames.filter(($) => {
      const doc = $[memoryDoc] as MemoryDoc | undefined;
      const userToFind = $[user] as string;
      const imageToFind = $[imageUrl] as string;

      return doc &&
        doc.contributions.some((c) =>
          c.user === userToFind && c.imageUrls.includes(imageToFind)
        );
    });
  },
  then: actions([
    MemoryEntries.deleteImage,
    { user, memory, imageUrl },
  ]),
});

/**
 * Responds to the client upon successful image deletion.
 */
export const AuthorizeDeleteImageFromMemoryResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/delete" }, { request }],
    // The `deleteImage` action returns an empty object on success.
    [MemoryEntries.deleteImage, {}, {}],
  ),
  then: actions([
    Requesting.respond,
    { request, status: "success" },
  ]),
});

/**
 * Responds to the client with an error if image deletion fails.
 */
export const AuthorizeDeleteImageFromMemoryResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/delete" }, { request }],
    [MemoryEntries.deleteImage, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
