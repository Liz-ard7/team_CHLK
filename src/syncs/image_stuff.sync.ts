import { actions, Sync } from "@engine";
import { Groups, ImageStorage, Memoryentries, Requesting } from "@concepts";

//
// Syncs for Requesting a Secure Image Upload URL
//

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
      Memoryentries._getMemory,
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
      Memoryentries._getMemory,
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
    Memoryentries.deleteImage,
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
    [Memoryentries.deleteImage, {}, {}],
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
    [Memoryentries.deleteImage, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
