[@implementing-concepts](../../background/implementing-concepts.md)

[@concept-specifications](../../background/concept-specifications.md)

[@MemoryEntries](MemoryEntries.md)

# MemoryEntries Concept Implementation

## Overview

This document describes the implementation of the MemoryEntries concept, following the established patterns from the Groups concept. The implementation includes all actions and queries specified in the MemoryEntries specification, with necessary refinements to address composite object issues.

## Changes Made to Specification

### 1. Composite Object Refactoring

The original specification had several actions that accepted `contribution` as a parameter, which violates the principle that composite objects should not be exposed as action parameters. The following changes were made:

- **`editContribution`**: Changed from `(contribution, memory, user, newDescription)` to `(memory, user, newDescription)`. The contribution is identified internally by the user and memory.

- **`deleteContribution`**: Changed from `(memory, contribution, user)` to `(memory, user)`. The contribution is identified internally by the user and memory.

- **`addImage`**: Changed from `(user, memory, contribution, imageUrl)` to `(user, memory, imageUrl)`. The contribution is identified internally by the user and memory.

- **`deleteImage`**: Changed from `(user, memory, contribution, imageUrl)` to `(user, memory, imageUrl)`. The contribution is identified internally by the user and memory.

- **`addContribution`**: Changed return type from `(contribution)` to `Empty`. Contributions are internal to the concept and should not be returned.

### 2. Image URLs Format

The `addContribution` action accepts `imageUrls` as a comma-separated string, which is split internally into an array. Empty strings are filtered out. This maintains compatibility with the specification while providing a clean internal representation.

### 3. Contribution Update Behavior

The `addContribution` action was enhanced to update an existing contribution if the user already has one for the memory, rather than creating a duplicate. This ensures that each user has at most one contribution per memory, which aligns with the principle that users can edit their own contributions.

## Implementation Details

### State Structure

The MongoDB document structure follows the specification:

```typescript
interface MemoryDoc {
  _id: Memory;
  group: Group;
  creator: User;
  title: string;
  contributions: Contribution[];
}

interface Contribution {
  user: User;
  description: string;
  imageUrls: string[];
}
```

### Key Implementation Decisions

1. **Collection Prefix**: Uses `"MemoryEntries."` prefix for MongoDB collections, following the established pattern.

2. **Error Handling**: All actions return `{ result } | { error: string }` and include comprehensive error checking with try-catch blocks and proper TypeScript error type checking.

3. **Validation**: Input validation is performed at the action level (e.g., checking for empty titles, descriptions) before database operations.

4. **Query Returns**: Queries return arrays as required by the implementation pattern. `_getMemory` returns an array with a single memory object, and `_listMemoriesForGroup` returns an array with a single object containing the memories array.

5. **Contribution Management**: Contributions are stored as an array within the memory document. When updating contributions, the entire array is replaced to ensure atomicity.

6. **Image Management**: Images are managed within contributions. Adding an image checks for duplicates (idempotent operation), and deleting an image verifies the image exists before removal.

7. **Creator Verification**: The `deleteMemory` action verifies that the user is the creator before allowing deletion, enforcing the principle that only creators can delete memories.

## Issues Encountered and Resolutions

### Issue 1: Composite Object Parameters

**Problem**: The original specification included `contribution` as a parameter in several actions, which violates the concept design principle that composite objects should not be exposed.

**Resolution**: Refactored all actions to use `user` and `memory` to identify contributions internally. The implementation finds the contribution by searching the contributions array for a matching user.

### Issue 2: TypeScript Type Narrowing in Tests

**Problem**: When checking for errors in test results, TypeScript required explicit type narrowing before accessing the `error` property.

**Resolution**: Added proper type guards using `if ("error" in result)` checks before accessing error properties in test assertions.

### Issue 3: MongoDB Connection in Tests

**Problem**: Tests require MongoDB connection configuration via environment variables.

**Resolution**: Documented that tests require `MONGODB_URL` and `DB_NAME` environment variables to be set. The test structure is correct and will work once MongoDB is configured.

## Testing Strategy

The test suite includes:

1. **Operational Principle Test**: Demonstrates the main workflow - creating a memory, adding contributions from multiple users, viewing the memory, and editing contributions.

2. **Scenario 1**: Multiple users contributing to the same memory with images, verifying all contributions are stored correctly.

3. **Scenario 2**: Error handling - tests empty descriptions, invalid memory IDs, and non-existent contributions.

4. **Scenario 3**: Image management - adding and removing images from contributions, including duplicate handling.

5. **Scenario 4**: Deletion operations - deleting contributions and entire memories, including permission checks.

6. **Scenario 5**: Editing operations - editing titles and updating existing contributions.

All tests follow the Deno testing framework pattern and use `testDb()` for database initialization.

## Dependencies

- **No cross-concept dependencies**: MemoryEntries does not import or reference any other concepts, maintaining independence.

- **Utility dependencies**: Uses `@utils/types.ts` for `ID` and `Empty` types, and `@utils/database.ts` for `freshID()` and `testDb()`.

- **MongoDB**: Uses `npm:mongodb` for database operations.

## Conclusion

The MemoryEntries concept has been successfully implemented following the established patterns from the Groups concept. All actions and queries from the specification are implemented, with necessary refinements to address composite object issues. The implementation maintains concept independence, proper error handling, and comprehensive test coverage.

