[@implemention-synchronizations](../background/implementing-synchronizations.md)

[@implementation](../concepts/groups/implementation.md)

[@implementation](../concepts/memoryentries/implementation.md)

[@implementation](../concepts/UserAuthentication/implementation.md)

[@ImageStorage](../concepts/ImageStorage.md)


#### sync RequestMemoryImageUploadUrl

* when
	* Request.request(path: "/memory-images/upload-url", user, memory, filename, contentType) : (req_id)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND group of memory_M is G
	* in Groups: user is a member of G
* then
	* ImageStorage.requestUploadUrl(user, filename, contentType) : (uploadUrl, bucket, object)
	* Request.respond(request: req_id, uploadUrl, bucket, object, memory, user)

#### sync AuthorizeDeleteImageFromMemory

* when
	* Request.deleteImage(user, memory, contribution, imageUrl)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user AND contribution_C's imageUrls contains imageUrl
* then
	* MemoryEntries.deleteImage(memory, user, contribution, imageUrl)

# Prompt: Please write the syncs
# response:

Of course. Here are the TypeScript implementations for the specified synchronizations, following the established request-response pattern for robust handling of actions and their outcomes.

# file: src/syncs/memory/ImageSyncs.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Groups, ImageStorage, MemoryEntries, Requesting } from "@concepts";

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
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, { memory: memoryDoc });
    // 2. Filter out requests where the memory doesn't exist.
    frames = frames.filter(($) => $[memoryDoc]);
    // 3. Extract the group ID from the memory document and add it to the frame.
    frames = frames.map(($) => ({ ...$, [group]: $[memoryDoc].group }));
    // 4. Get the list of members for that group.
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, { members });
    // 5. Authorize by keeping only frames where the requesting user is in the member list.
    return frames.filter(($) => $[members] && $[members].includes($[user]));
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
    [Requesting.request, { path: "/memory-images/upload-url", user, memory }, { request }],
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
export const RequestMemoryImageUploadUrlResponseError: Sync = ({ request, error }) => ({
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
    // 1. Fetch the memory document.
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, { memory: memoryDoc });
    // 2. Authorize by ensuring the memory exists and contains a contribution from the user
    //    that includes the specified image URL.
    return frames.filter(($) =>
      $[memoryDoc] &&
      $[memoryDoc].contributions.some(
        (c: { user: string; imageUrls: string[] }) => c.user === $[user] && c.imageUrls.includes($[imageUrl]),
      )
    );
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
export const AuthorizeDeleteImageFromMemoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/delete" }, { request }],
    [MemoryEntries.deleteImage, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
```

# Prompt: There are some unknown type issues
# response:

# problem:

The provided synchronization code has potential TypeScript errors within the `where` clauses. When data is added to a `frame` using `frames.query`, TypeScript types it as `unknown` for safety. Accessing properties on these `unknown` values (e.g., `$[memoryDoc].group` or `$[members].includes(...)`) will result in a compile-time error because their shape is not known.

# solution:

To resolve these errors, we must provide TypeScript with the expected shape of the data retrieved from the frames. This is done using type assertions (e.g., `($[memoryDoc] as MyType).property`). By casting the `unknown` values to their correct types, we can safely access their properties and methods, resolving the type errors while making the code's intent clearer.

The updated code below includes these necessary type assertions to ensure the synchronizations are type-safe.

# file: src/syncs/memory/ImageSyncs.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Groups, ImageStorage, MemoryEntries, Requesting } from "@concepts";

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
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, { memory: memoryDoc });
    // 2. Filter out requests where the memory doesn't exist.
    frames = frames.filter(($) => $[memoryDoc]);
    // 3. Extract the group ID from the memory document and add it to the frame.
    frames = frames.map(($) => ({ ...$, [group]: ($[memoryDoc] as { group: string }).group }));
    // 4. Get the list of members for that group.
    frames = await frames.query(Groups._getGroupDetails, { groupID: group }, { members });
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
    [Requesting.request, { path: "/memory-images/upload-url", user, memory }, { request }],
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
export const RequestMemoryImageUploadUrlResponseError: Sync = ({ request, error }) => ({
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
    frames = await frames.query(MemoryEntries._getMemory, { memoryID: memory }, { memory: memoryDoc });
    // 2. Authorize by ensuring the memory exists and contains a contribution from the user
    //    that includes the specified image URL.
    return frames.filter(($) => {
      const doc = $[memoryDoc] as MemoryDoc | undefined;
      const userToFind = $[user] as string;
      const imageToFind = $[imageUrl] as string;

      return doc && doc.contributions.some((c) => c.user === userToFind && c.imageUrls.includes(imageToFind));
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
export const AuthorizeDeleteImageFromMemoryResponseError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/memory-images/delete" }, { request }],
    [MemoryEntries.deleteImage, {}, { error }],
  ),
  then: actions([
    Requesting.respond,
    { request, error },
  ]),
});
```