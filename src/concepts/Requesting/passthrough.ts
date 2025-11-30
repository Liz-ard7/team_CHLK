/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Public queries that don't require authorization
  "/api/MemoryEntries/_getMemory": "public query to get memory details",
  "/api/MemoryEntries/_listMemoriesForGroup": "public query to list memories for a group",
  "/api/Groups/_getGroupDetails": "public query to get group details",
  "/api/Groups/_listGroupsForUser": "public query to list groups for a user",
  "/api/UserAuthentication/_userExists": "public query to check if user exists",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Memory-related actions that use syncs for authorization
  "/api/MemoryEntries/createMemory",
  "/api/MemoryEntries/editTitle",
  "/api/MemoryEntries/addContribution",
  "/api/MemoryEntries/editContribution",
  "/api/MemoryEntries/deleteContribution",
  "/api/MemoryEntries/deleteMemory",
  "/api/MemoryEntries/addImage",
  "/api/MemoryEntries/deleteImage",
  
  // Group-related actions that use syncs for authorization
  "/api/Groups/inviteMember",
  
  // User-related actions that use syncs
  "/api/UserAuthentication/changePhoto",
  
  // Image storage actions that use syncs
  "/api/ImageStorage/requestUploadUrl",
  "/api/ImageStorage/confirmUpload",
];
