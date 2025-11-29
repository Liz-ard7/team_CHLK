import {
  Groups,
  ImageStorage,
  MemoryEntries,
  Requesting,
  UserAuthentication,
} from "@concepts";
import { actions, Frames, Sync } from "@engine";
import type { Frame } from "../engine/frames.ts";

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
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, {
      memoryObj,
    });

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
