---
timestamp: 'Wed Dec 03 2025 11:42:51 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251203_114251.85212cf7.md]]'
content_id: a33fb71baabf46768722ddd52ccb76990c4a4adf369975c0827587aa39952fa8
---

# file: src/concepts/memoryentries/MemoryEntriesConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "MemoryEntries" + ".";

// Generic types of this concept
type User = ID;
type Group = ID;
type Memory = ID;

/**
 * @concept MemoryEntries
 * @purpose Record and organize shared memories within a group, allowing members to collectively contribute photos and descriptions that capture meaningful experiences
 * @principle Each memory belongs to a specific group and a user. Members can create a new memory entry, edit its title or description, and add or remove images to reflect shared experiences. A memory can be viewed by all group members. Group members can edit the title of the memory and add their own individual descriptions (textual and visual). Only the creator of the memory can delete the memory. This design ensures that each memory grows through collective input while maintaining clear ownership and editing control. Each memory has a creator, and group members can add their own contributions (descriptions and images). Users can edit or delete their own contributions.
 */

/**
 * A set of Memories with
 * - A Memory ID String (mapped to _id)
 * - A group (given as ID)
 * - A creator User
 * - A title String
 * - A date the memory occurred
 * - A set of Contributions with
 *   - A set of imageUrls String
 *   - A description String
 *   - An associated user User
 */
interface Contribution {
  user: User;
  description: string;
  imageUrls: string[];
}

interface MemoryDoc {
  _id: Memory;
  group: Group;
  creator: User;
  title: string;
  date: Date;
  contributions: Contribution[];
}

export default class MemoryEntriesConcept {
  public readonly memories: Collection<MemoryDoc>;

  constructor(private readonly db: Db) {
    this.memories = this.db.collection(PREFIX + "memories");
  }

  /**
   * createMemory (creator: User, group: String, title: String, date: String): (memory: Memory)
   *
   * @requires the creator and group to exist, creator is a member of the group, title is non-empty, date is a valid date string
   * @effects create a new memory record with the parameter title and date, an empty set of contributions, and a randomly generated ID linked to the group.
   */
  async createMemory(
    { creator, group, title, date }: {
      creator: User;
      group: Group;
      title: string;
      date: string;
    },
  ): Promise<{ memory: Memory } | { error: string }> {
    // Note: The 'creator exists' and 'creator is a member of the group' requirements cannot be checked within this concept.
    // This must be enforced by the calling context or a dedicated Group/User concept.

    if (title.trim() === "") {
      return { error: "Title cannot be empty." };
    }

    const memoryDate = new Date(date);
    if (isNaN(memoryDate.getTime())) {
      return { error: "Invalid date format." };
    }

    const memoryID = freshID() as Memory;

    const newMemory: MemoryDoc = {
      _id: memoryID,
      group: group,
      creator: creator,
      title: title.trim(),
      date: memoryDate,
      contributions: [],
    };

    try {
      const result = await this.memories.insertOne(newMemory);
      if (!result.acknowledged) {
        return { error: "Database operation failed: could not create memory." };
      }
      return { memory: memoryID };
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while creating memory: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while creating memory." };
    }
  }

  /**
   * editTitle(memory: Memory, user: User, newTitle: String)
   *
   * @requires user, memory, and group to exist. user is within the group that the memory is in. newTitle is non-empty
   * @effects Changes the title of the memory with the given id to newTitle
   */
  async editTitle(
    { memory, user, newTitle }: {
      memory: Memory;
      user: User;
      newTitle: string;
    },
  ): Promise<Empty | { error: string }> {
    if (newTitle.trim() === "") {
      return { error: "Title cannot be empty." };
    }

    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      // Note: We cannot check if user is in the group within this concept.
      // This must be enforced by the calling context.

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { title: newTitle.trim() } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not edit title.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while editing title: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while editing title." };
    }
  }

  /**
   * editDate(memory: Memory, user: User, newDate: String)
   *
   * @requires user, memory, and group to exist. user is within the group that the memory is in. newDate is a valid date string.
   * @effects Changes the date of the memory with the given id to newDate
   */
  async editDate(
    { memory, user, newDate }: { memory: Memory; user: User; newDate: string },
  ): Promise<Empty | { error: string }> {
    const memoryDate = new Date(newDate);
    if (isNaN(memoryDate.getTime())) {
      return { error: "Invalid date format." };
    }

    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      // Note: We cannot check if user is in the group within this concept.

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { date: memoryDate } },
      );

      if (!result.acknowledged) {
        return { error: "Database operation failed: could not edit date." };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while editing date: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while editing date." };
    }
  }

  /**
   * editContribution (memory: Memory, contributionIndex: Number, user: User, newDescription: String, newImageUrls?: String)
   *
   * @requires memory and user to exist, user is within the group that the memory is in, contributionIndex is valid, newDescription cannot be empty, the contribution at contributionIndex belongs to the user
   * @effects update the contribution's description and optionally the imageUrls of the user for the particular memory. If newImageUrls is provided, replace the existing imageUrls with the new ones (comma-separated string).
   */
  async editContribution(
    { memory, contributionIndex, user, newDescription, newImageUrls }: {
      memory: Memory;
      contributionIndex: number;
      user: User;
      newDescription: string;
      newImageUrls?: string;
    },
  ): Promise<Empty | { error: string }> {
    if (newDescription.trim() === "") {
      return { error: "Description cannot be empty." };
    }

    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      // Validate contribution index
      if (
        contributionIndex < 0 ||
        contributionIndex >= memoryDoc.contributions.length
      ) {
        return { error: "Invalid contribution index." };
      }

      // Verify the contribution belongs to the user
      if (memoryDoc.contributions[contributionIndex].user !== user) {
        return { error: "Cannot edit another user's contribution." };
      }

      // Update the contribution
      const updatedContributions = [...memoryDoc.contributions];
      const existingContribution = updatedContributions[contributionIndex];

      // Parse new image URLs if provided
      let imageUrlArray = existingContribution.imageUrls;
      if (newImageUrls !== undefined) {
        imageUrlArray = newImageUrls
          .split(",")
          .map((url) => url.trim())
          .filter((url) => url !== "");
      }

      updatedContributions[contributionIndex] = {
        ...existingContribution,
        description: newDescription.trim(),
        imageUrls: imageUrlArray,
      };

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { contributions: updatedContributions } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not edit contribution.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while editing contribution: ${e.message}`,
        };
      }
      return {
        error: "An unknown error occurred while editing contribution.",
      };
    }
  }

  /**
   * addContribution(memory: Memory, user: User, description: String, imageUrls: String)
   *
   * @requires user to be a member of the group associated with memory, description cannot be empty
   * @effects add a new contribution with the User user, split the imageUrls string (comma-separated) into a set of imageUrl strings, and description as description. Add this contribution to the memory's set of contributions. Users can add multiple contributions to the same memory.
   */
  async addContribution(
    { memory, user, description, imageUrls }: {
      memory: Memory;
      user: User;
      description: string;
      imageUrls: string;
    },
  ): Promise<Empty | { error: string }> {
    if (description.trim() === "") {
      return { error: "Description cannot be empty." };
    }

    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      // Split imageUrls string by comma and filter out empty strings
      const imageUrlArray = imageUrls
        .split(",")
        .map((url) => url.trim())
        .filter((url) => url !== "");

      const newContribution: Contribution = {
        user: user,
        description: description.trim(),
        imageUrls: imageUrlArray,
      };

      // Always add a new contribution (users can have multiple contributions)
      const updatedContributions = [
        ...memoryDoc.contributions,
        newContribution,
      ];

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { contributions: updatedContributions } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not add contribution.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while adding contribution: ${e.message}`,
        };
      }
      return {
        error: "An unknown error occurred while adding contribution.",
      };
    }
  }

  /**
   * deleteContribution(memory: Memory, contributionIndex: Number, user: User)
   *
   * @requires memory and user to exist, contributionIndex is valid, the contribution at contributionIndex belongs to user
   * @effects remove the contribution at the specified index from memory's set of contributions
   */
  async deleteContribution(
    { memory, contributionIndex, user }: {
      memory: Memory;
      contributionIndex: number;
      user: User;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      // Validate contribution index
      if (
        contributionIndex < 0 ||
        contributionIndex >= memoryDoc.contributions.length
      ) {
        return { error: "Invalid contribution index." };
      }

      // Verify the contribution belongs to the user
      if (memoryDoc.contributions[contributionIndex].user !== user) {
        return { error: "Cannot delete another user's contribution." };
      }

      // Remove the contribution at the specific index
      const updatedContributions = memoryDoc.contributions.filter(
        (_, index) => index !== contributionIndex,
      );

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { contributions: updatedContributions } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not delete contribution.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while deleting contribution: ${e.message}`,
        };
      }
      return {
        error: "An unknown error occurred while deleting contribution.",
      };
    }
  }

  /**
   * addImage(user: User, memory: Memory, imageUrl: String)
   *
   * @requires user and memory to exist, user is associated with a contribution in memory, imageUrl corresponds to an existing image
   * @effects Adds image to the set of images within the user's contribution for this memory
   */
  async addImage(
    { user, memory, imageUrl }: {
      user: User;
      memory: Memory;
      imageUrl: string;
    },
  ): Promise<Empty | { error: string }> {
    if (imageUrl.trim() === "") {
      return { error: "Image URL cannot be empty." };
    }

    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      const contributionIndex = memoryDoc.contributions.findIndex(
        (c) => c.user === user,
      );

      if (contributionIndex === -1) {
        return {
          error: "User does not have a contribution for this memory.",
        };
      }

      const contribution = memoryDoc.contributions[contributionIndex];

      // Check if image already exists
      if (contribution.imageUrls.includes(imageUrl.trim())) {
        // Image already exists, which is not an error
        return {};
      }

      // Add the image
      const updatedImageUrls = [...contribution.imageUrls, imageUrl.trim()];
      const updatedContributions = [...memoryDoc.contributions];
      updatedContributions[contributionIndex] = {
        ...contribution,
        imageUrls: updatedImageUrls,
      };

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { contributions: updatedContributions } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not add image.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while adding image: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while adding image." };
    }
  }

  /**
   * deleteImage (user: User, memory: Memory, imageUrl: String)
   *
   * @requires user and memory to exist, user is associated with a contribution in memory, the contribution contains the parameter imageUrl
   * @effects removes image from the user's contribution for this memory
   */
  async deleteImage(
    { user, memory, imageUrl }: {
      user: User;
      memory: Memory;
      imageUrl: string;
    },
  ): Promise<Empty | { error: string }> {
    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      const contributionIndex = memoryDoc.contributions.findIndex(
        (c) => c.user === user,
      );

      if (contributionIndex === -1) {
        return {
          error: "User does not have a contribution for this memory.",
        };
      }

      const contribution = memoryDoc.contributions[contributionIndex];

      if (!contribution.imageUrls.includes(imageUrl)) {
        return {
          error: "Image URL not found in user's contribution.",
        };
      }

      // Remove the image
      const updatedImageUrls = contribution.imageUrls.filter(
        (url) => url !== imageUrl,
      );
      const updatedContributions = [...memoryDoc.contributions];
      updatedContributions[contributionIndex] = {
        ...contribution,
        imageUrls: updatedImageUrls,
      };

      const result = await this.memories.updateOne(
        { _id: memory },
        { $set: { contributions: updatedContributions } },
      );

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not delete image.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while deleting image: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while deleting image." };
    }
  }

  /**
   * deleteMemory (memory: Memory, creator: User)
   *
   * @requires a memory created by user-self exists
   * @effects removes the entire memory from the group, removes all contributions associated with that memory
   */
  async deleteMemory(
    { memory, creator }: { memory: Memory; creator: User },
  ): Promise<Empty | { error: string }> {
    try {
      const memoryDoc = await this.memories.findOne({ _id: memory });

      if (!memoryDoc) {
        return { error: "Memory not found." };
      }

      if (memoryDoc.creator !== creator) {
        return {
          error: "Permission denied: Only the creator can delete the memory.",
        };
      }

      const result = await this.memories.deleteOne({ _id: memory });

      if (!result.acknowledged) {
        return {
          error: "Database operation failed: could not delete memory.",
        };
      }

      return {};
    } catch (e) {
      if (e instanceof Error) {
        return {
          error:
            `An unexpected error occurred while deleting memory: ${e.message}`,
        };
      }
      return { error: "An unknown error occurred while deleting memory." };
    }
  }

  /**
   * _getMemory (memoryID: String): (memory: Memory)
   *
   * @requires memoryID exists, and the requesting user (if any) is a member of the associated group (implied security context, possibly via syncs).
   * @effects Returns the full memory object.
   */
  async _getMemory(
    { memoryID }: { memoryID: string },
  ): Promise<
    Array<{
      memory: {
        memoryID: Memory;
        group: Group;
        creator: User;
        title: string;
        date: string;
        contributions: Contribution[];
      };
    }>
  > {
    try {
      const memoryDoc = await this.memories.findOne({
        _id: memoryID as Memory,
      });

      if (!memoryDoc) {
        return [];
      }

      return [
        {
          memory: {
            memoryID: memoryDoc._id,
            group: memoryDoc.group,
            creator: memoryDoc.creator,
            title: memoryDoc.title,
            date: memoryDoc.date.toISOString(),
            contributions: memoryDoc.contributions,
          },
        },
      ];
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(`Database query failed in _getMemory: ${e.message}`);
      }
      throw new Error("An unknown database error occurred in _getMemory.");
    }
  }

  /**
   * _listMemoriesForGroup (groupID: String): (memories: Set<Memory>)
   *
   * @requires `groupID` exists, and the requesting user is a member of `groupID`.
   * @effects Returns a set of memory objects for the specified group.
   */
  async _listMemoriesForGroup(
    { groupID }: { groupID: string },
  ): Promise<Array<{ memories: Memory[] }>> {
    try {
      const groupMemories = await this.memories
        .find({ group: groupID as Group })
        .toArray();
      const memoryIds = groupMemories.map((memory) => memory._id);

      return [{ memories: memoryIds }];
    } catch (e) {
      if (e instanceof Error) {
        throw new Error(
          `Database query failed in _listMemoriesForGroup: ${e.message}`,
        );
      }
      throw new Error(
        "An unknown database error occurred in _listMemoriesForGroup.",
      );
    }
  }
}
```

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import MemoryEntriesConcept from "./MemoryEntriesConcept.ts";

const user1 = "user:Alice" as ID;
const user2 = "user:Bob" as ID;
const user3 = "user:Charlie" as ID;
const group1 = "group:Friends" as ID;
const group2 = "group:Family" as ID;

Deno.test(
  "Operational Principle: Create memory, add contributions from multiple users, view memory, edit contributions",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Operational Principle Test ===");

      // 1. User1 creates a memory
      console.log("1. Creating memory...");
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Summer Trip 2024",
      });
      assertExists(createResult);
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;
      console.log(`   Created memory: ${memoryID}`);

      // 2. User1 adds their contribution
      console.log("2. User1 adding contribution...");
      const addContribution1Result = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "What an amazing trip! We visited three countries.",
        imageUrls:
          "https://example.com/photo1.jpg,https://example.com/photo2.jpg",
      });
      if ("error" in addContribution1Result) {
        throw new Error(
          `Failed to add contribution: ${addContribution1Result.error}`,
        );
      }
      console.log("   User1 contribution added");

      // 3. User2 adds their contribution
      console.log("3. User2 adding contribution...");
      const addContribution2Result = await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "The food was incredible!",
        imageUrls: "https://example.com/photo3.jpg",
      });
      if ("error" in addContribution2Result) {
        throw new Error(
          `Failed to add contribution: ${addContribution2Result.error}`,
        );
      }
      console.log("   User2 contribution added");

      // 4. View the memory
      console.log("4. Viewing memory...");
      const getMemoryResult = await memoryConcept._getMemory({
        memoryID: memoryID,
      });
      assertEquals(getMemoryResult.length, 1);
      const memory = getMemoryResult[0].memory;
      assertEquals(memory.title, "Summer Trip 2024");
      assertEquals(memory.contributions.length, 2);
      console.log(`   Memory has ${memory.contributions.length} contributions`);

      // 5. User1 edits their contribution
      console.log("5. User1 editing contribution...");
      const editContributionResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 0, // User1's contribution is at index 0
        user: user1,
        newDescription:
          "What an amazing trip! We visited three countries and made unforgettable memories.",
      });
      if ("error" in editContributionResult) {
        throw new Error(
          `Failed to edit contribution: ${editContributionResult.error}`,
        );
      }
      console.log("   User1 contribution edited");

      // 6. Verify the edit
      const getMemoryAfterEdit = await memoryConcept._getMemory({
        memoryID: memoryID,
      });
      const user1Contribution = getMemoryAfterEdit[0].memory.contributions.find(
        (c) => c.user === user1,
      );
      assertExists(user1Contribution);
      assertEquals(
        user1Contribution.description,
        "What an amazing trip! We visited three countries and made unforgettable memories.",
      );
      console.log("   Edit verified successfully");

      console.log("✓ Operational principle test passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 1: Multiple users contributing to same memory with images",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 1: Multiple Users Contributing ===");

      // Create memory
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Birthday Party",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;
      console.log(`Created memory: ${memoryID}`);

      // User1 adds contribution with images
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "Great party!",
        imageUrls: "url1.jpg,url2.jpg",
      });
      console.log("User1 added contribution with 2 images");

      // User2 adds contribution
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "Had so much fun!",
        imageUrls: "url3.jpg",
      });
      console.log("User2 added contribution with 1 image");

      // User3 adds contribution
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user3,
        description: "Best birthday ever!",
        imageUrls: "",
      });
      console.log("User3 added contribution with no images");

      // Verify all contributions
      const memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(memory.length, 1);
      assertEquals(memory[0].memory.contributions.length, 3);
      assertEquals(memory[0].memory.contributions[0].imageUrls.length, 2);
      assertEquals(memory[0].memory.contributions[1].imageUrls.length, 1);
      assertEquals(memory[0].memory.contributions[2].imageUrls.length, 0);
      console.log("✓ All contributions verified");

      console.log("✓ Scenario 1 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 2: Error cases - empty descriptions, invalid memory IDs, non-member access",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 2: Error Cases ===");

      // Test: Create memory with empty title should fail
      console.log("1. Testing empty title...");
      const emptyTitleResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "",
      });
      assertExists(emptyTitleResult);
      assertEquals("error" in emptyTitleResult, true);
      if ("error" in emptyTitleResult) {
        console.log(`   ✓ Empty title rejected: ${emptyTitleResult.error}`);
      }

      // Create a valid memory first
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Valid Memory",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;

      // Test: Add contribution with empty description should fail
      console.log("2. Testing empty description...");
      const emptyDescResult = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "",
        imageUrls: "",
      });
      assertEquals("error" in emptyDescResult, true);
      if ("error" in emptyDescResult) {
        console.log(
          `   ✓ Empty description rejected: ${emptyDescResult.error}`,
        );
      }

      // Test: Edit title with empty title should fail
      console.log("3. Testing edit title with empty title...");
      const emptyEditTitleResult = await memoryConcept.editTitle({
        memory: memoryID,
        user: user1,
        newTitle: "",
      });
      assertEquals("error" in emptyEditTitleResult, true);
      if ("error" in emptyEditTitleResult) {
        console.log(
          `   ✓ Empty edit title rejected: ${emptyEditTitleResult.error}`,
        );
      }

      // Test: Get non-existent memory should return empty array
      console.log("4. Testing non-existent memory...");
      const invalidMemoryResult = await memoryConcept._getMemory({
        memoryID: "invalid:memory" as ID,
      });
      assertEquals(invalidMemoryResult.length, 0);
      console.log("   ✓ Non-existent memory returns empty array");

      // Test: Edit contribution with invalid index should fail
      console.log("5. Testing edit with invalid contribution index...");
      const editInvalidIndexResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 99, // Invalid index
        user: user1,
        newDescription: "This should fail",
      });
      assertEquals("error" in editInvalidIndexResult, true);
      if ("error" in editInvalidIndexResult) {
        console.log(
          `   ✓ Edit with invalid index rejected: ${editInvalidIndexResult.error}`,
        );
      }

      console.log("✓ Scenario 2 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 3: Adding and removing images from contributions",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 3: Image Management ===");

      // Create memory and add contribution
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Photo Album",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;

      await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "My photos",
        imageUrls: "photo1.jpg,photo2.jpg",
      });
      console.log("Created memory with 2 initial images");

      // Add a new image
      console.log("1. Adding new image...");
      const addImageResult = await memoryConcept.addImage({
        memory: memoryID,
        user: user1,
        imageUrl: "photo3.jpg",
      });
      if ("error" in addImageResult) {
        throw new Error(`Failed to add image: ${addImageResult.error}`);
      }

      // Verify image was added
      const memoryAfterAdd = await memoryConcept._getMemory({
        memoryID: memoryID,
      });
      const contribution = memoryAfterAdd[0].memory.contributions.find(
        (c) => c.user === user1,
      );
      assertExists(contribution);
      assertEquals(contribution.imageUrls.length, 3);
      assertEquals(contribution.imageUrls.includes("photo3.jpg"), true);
      console.log("   ✓ Image added successfully");

      // Try to add duplicate image (should be idempotent)
      console.log("2. Adding duplicate image (should be idempotent)...");
      const addDuplicateResult = await memoryConcept.addImage({
        memory: memoryID,
        user: user1,
        imageUrl: "photo3.jpg",
      });
      if ("error" in addDuplicateResult) {
        throw new Error(
          `Failed to add duplicate image: ${addDuplicateResult.error}`,
        );
      }
      console.log("   ✓ Duplicate image handled gracefully");

      // Delete an image
      console.log("3. Deleting image...");
      const deleteImageResult = await memoryConcept.deleteImage({
        memory: memoryID,
        user: user1,
        imageUrl: "photo2.jpg",
      });
      if ("error" in deleteImageResult) {
        throw new Error(`Failed to delete image: ${deleteImageResult.error}`);
      }

      // Verify image was deleted
      const memoryAfterDelete = await memoryConcept._getMemory({
        memoryID: memoryID,
      });
      const contributionAfterDelete = memoryAfterDelete[0].memory.contributions
        .find(
          (c) => c.user === user1,
        );
      assertExists(contributionAfterDelete);
      assertEquals(contributionAfterDelete.imageUrls.length, 2);
      assertEquals(
        contributionAfterDelete.imageUrls.includes("photo2.jpg"),
        false,
      );
      console.log("   ✓ Image deleted successfully");

      // Try to delete non-existent image should fail
      console.log("4. Testing delete non-existent image...");
      const deleteNonExistentResult = await memoryConcept.deleteImage({
        memory: memoryID,
        user: user1,
        imageUrl: "nonexistent.jpg",
      });
      assertEquals("error" in deleteNonExistentResult, true);
      if ("error" in deleteNonExistentResult) {
        console.log(
          `   ✓ Delete non-existent image rejected: ${deleteNonExistentResult.error}`,
        );
      }

      console.log("✓ Scenario 3 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 4: Deleting contributions and memory",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 4: Deletion Operations ===");

      // Create memory with multiple contributions
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Group Memory",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;

      await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "User1's contribution",
        imageUrls: "",
      });
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "User2's contribution",
        imageUrls: "",
      });
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user3,
        description: "User3's contribution",
        imageUrls: "",
      });
      console.log("Created memory with 3 contributions");

      // Verify initial state
      let memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(memory[0].memory.contributions.length, 3);
      console.log("1. Verified 3 contributions exist");

      // Delete user2's contribution (at index 1)
      console.log("2. Deleting user2's contribution...");
      const deleteContributionResult = await memoryConcept.deleteContribution({
        memory: memoryID,
        contributionIndex: 1, // User2's contribution is at index 1
        user: user2,
      });
      if ("error" in deleteContributionResult) {
        throw new Error(
          `Failed to delete contribution: ${deleteContributionResult.error}`,
        );
      }

      // Verify contribution was deleted
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(memory[0].memory.contributions.length, 2);
      const user2Contribution = memory[0].memory.contributions.find(
        (c) => c.user === user2,
      );
      assertEquals(user2Contribution, undefined);
      console.log("   ✓ User2's contribution deleted");

      // Try to delete with invalid index should fail
      console.log("3. Testing delete with invalid index...");
      const deleteNonExistentResult = await memoryConcept.deleteContribution({
        memory: memoryID,
        contributionIndex: 99, // Invalid index
        user: user1,
      });
      assertEquals("error" in deleteNonExistentResult, true);
      if ("error" in deleteNonExistentResult) {
        console.log(
          `   ✓ Delete non-existent contribution rejected: ${deleteNonExistentResult.error}`,
        );
      }

      // Delete the entire memory (only creator can do this)
      console.log("4. Deleting entire memory (as creator)...");
      const deleteMemoryResult = await memoryConcept.deleteMemory({
        memory: memoryID,
        creator: user1,
      });
      if ("error" in deleteMemoryResult) {
        throw new Error(`Failed to delete memory: ${deleteMemoryResult.error}`);
      }

      // Verify memory was deleted
      const deletedMemory = await memoryConcept._getMemory({
        memoryID: memoryID,
      });
      assertEquals(deletedMemory.length, 0);
      console.log("   ✓ Memory deleted successfully");

      // Try to delete memory as non-creator should fail
      console.log("5. Testing delete memory as non-creator...");
      const createResult2 = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Another Memory",
      });
      if ("error" in createResult2) {
        throw new Error(`Failed to create memory: ${createResult2.error}`);
      }
      const memoryID2 = createResult2.memory;

      const deleteAsNonCreatorResult = await memoryConcept.deleteMemory({
        memory: memoryID2,
        creator: user2, // Not the creator
      });
      assertEquals("error" in deleteAsNonCreatorResult, true);
      if ("error" in deleteAsNonCreatorResult) {
        console.log(
          `   ✓ Delete as non-creator rejected: ${deleteAsNonCreatorResult.error}`,
        );
      }

      console.log("✓ Scenario 4 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 5: Editing title and updating existing contributions",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 5: Editing and Updating ===");

      // Create memory
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Original Title",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;

      // Edit title
      console.log("1. Editing memory title...");
      const editTitleResult = await memoryConcept.editTitle({
        memory: memoryID,
        user: user1,
        newTitle: "Updated Title",
      });
      if ("error" in editTitleResult) {
        throw new Error(`Failed to edit title: ${editTitleResult.error}`);
      }

      // Verify title was updated
      let memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(memory[0].memory.title, "Updated Title");
      console.log("   ✓ Title updated successfully");

      // Add contribution
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "First description",
        imageUrls: "img1.jpg",
      });
      console.log("2. Added initial contribution");

      // Add second contribution from same user (users can now add multiple contributions)
      console.log("3. Adding second contribution from same user...");
      const addSecondContributionResult = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "Second description",
        imageUrls: "img1.jpg,img2.jpg,img3.jpg",
      });
      if ("error" in addSecondContributionResult) {
        throw new Error(
          `Failed to add second contribution: ${addSecondContributionResult.error}`,
        );
      }

      // Verify both contributions exist
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      const user1Contributions = memory[0].memory.contributions.filter(
        (c) => c.user === user1,
      );
      assertEquals(
        user1Contributions.length,
        2,
        "User1 should have 2 contributions",
      );
      assertEquals(user1Contributions[0].description, "First description");
      assertEquals(user1Contributions[0].imageUrls.length, 1);
      assertEquals(user1Contributions[1].description, "Second description");
      assertEquals(user1Contributions[1].imageUrls.length, 3);
      assertEquals(user1Contributions[1].imageUrls.includes("img2.jpg"), true);
      console.log("   ✓ Both contributions exist for same user");

      // List memories for group
      console.log("4. Listing memories for group...");
      const listMemoriesResult = await memoryConcept._listMemoriesForGroup({
        groupID: group1,
      });
      assertEquals(listMemoriesResult.length, 1);
      assertEquals(listMemoriesResult[0].memories.length, 1);
      assertEquals(listMemoriesResult[0].memories[0], memoryID);
      console.log("   ✓ List memories for group works");

      console.log("✓ Scenario 5 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 6: Editing contribution with image updates",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log("\n=== Scenario 6: Edit Contribution with Images ===");

      // Create memory and add contribution
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Photo Gallery",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;

      // Add initial contribution with images
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "Original description",
        imageUrls: "img1.jpg,img2.jpg",
      });
      console.log("1. Added contribution with 2 images");

      // Verify initial state
      let memory = await memoryConcept._getMemory({ memoryID: memoryID });
      let contribution = memory[0].memory.contributions[0];
      assertEquals(contribution.imageUrls.length, 2);
      assertEquals(contribution.description, "Original description");

      // Edit description only (keep images)
      console.log("2. Editing description only...");
      const editDescResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 0,
        user: user1,
        newDescription: "Updated description",
        // newImageUrls not provided, should keep existing images
      });
      if ("error" in editDescResult) {
        throw new Error(`Failed to edit contribution: ${editDescResult.error}`);
      }

      // Verify description changed but images stayed the same
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      contribution = memory[0].memory.contributions[0];
      assertEquals(contribution.description, "Updated description");
      assertEquals(contribution.imageUrls.length, 2);
      assertEquals(contribution.imageUrls.includes("img1.jpg"), true);
      assertEquals(contribution.imageUrls.includes("img2.jpg"), true);
      console.log("   ✓ Description updated, images preserved");

      // Edit both description and images
      console.log("3. Editing description and images...");
      const editBothResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 0,
        user: user1,
        newDescription: "Final description",
        newImageUrls: "new1.jpg,new2.jpg,new3.jpg",
      });
      if ("error" in editBothResult) {
        throw new Error(`Failed to edit contribution: ${editBothResult.error}`);
      }

      // Verify both changed
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      contribution = memory[0].memory.contributions[0];
      assertEquals(contribution.description, "Final description");
      assertEquals(contribution.imageUrls.length, 3);
      assertEquals(contribution.imageUrls.includes("new1.jpg"), true);
      assertEquals(contribution.imageUrls.includes("new2.jpg"), true);
      assertEquals(contribution.imageUrls.includes("new3.jpg"), true);
      assertEquals(contribution.imageUrls.includes("img1.jpg"), false);
      console.log("   ✓ Both description and images updated");

      // Test: User cannot edit another user's contribution
      console.log("4. Testing edit protection...");
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "User2's contribution",
        imageUrls: "user2img.jpg",
      });

      const editOtherUserResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 1, // User2's contribution
        user: user1, // But trying as user1
        newDescription: "Trying to edit someone else's contribution",
      });
      assertEquals("error" in editOtherUserResult, true);
      if ("error" in editOtherUserResult) {
        console.log(
          `   ✓ Cannot edit other user's contribution: ${editOtherUserResult.error}`,
        );
      }

      // Test: Edit with empty newImageUrls should clear images
      console.log("5. Testing clear all images...");
      const clearImagesResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 0,
        user: user1,
        newDescription: "No images",
        newImageUrls: "", // Empty string should clear images
      });
      if ("error" in clearImagesResult) {
        throw new Error(`Failed to clear images: ${clearImagesResult.error}`);
      }

      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      contribution = memory[0].memory.contributions[0];
      assertEquals(contribution.imageUrls.length, 0);
      console.log("   ✓ Images cleared successfully");

      console.log("✓ Scenario 6 passed");
    } finally {
      await client.close();
    }
  },
);

Deno.test(
  "Interesting Scenario 7: User can add multiple contributions to the same memory",
  async () => {
    const [db, client] = await testDb();
    const memoryConcept = new MemoryEntriesConcept(db);

    try {
      console.log(
        "\n=== Scenario 7: Multiple Contributions from Same User ===",
      );

      // Create memory
      const createResult = await memoryConcept.createMemory({
        creator: user1,
        group: group1,
        title: "Multi-Contribution Memory",
      });
      if ("error" in createResult) {
        throw new Error(`Failed to create memory: ${createResult.error}`);
      }
      const memoryID = createResult.memory;
      console.log("1. Created memory");

      // User1 adds first contribution
      console.log("2. User1 adding first contribution...");
      const addFirstResult = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "First contribution from User1",
        imageUrls: "img1.jpg,img2.jpg",
      });
      if ("error" in addFirstResult) {
        throw new Error(
          `Failed to add first contribution: ${addFirstResult.error}`,
        );
      }

      // User1 adds second contribution
      console.log("3. User1 adding second contribution...");
      const addSecondResult = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "Second contribution from User1",
        imageUrls: "img3.jpg",
      });
      if ("error" in addSecondResult) {
        throw new Error(
          `Failed to add second contribution: ${addSecondResult.error}`,
        );
      }

      // User1 adds third contribution
      console.log("4. User1 adding third contribution...");
      const addThirdResult = await memoryConcept.addContribution({
        memory: memoryID,
        user: user1,
        description: "Third contribution from User1",
        imageUrls: "",
      });
      if ("error" in addThirdResult) {
        throw new Error(
          `Failed to add third contribution: ${addThirdResult.error}`,
        );
      }

      // Verify all three contributions exist
      let memory = await memoryConcept._getMemory({ memoryID: memoryID });
      const user1Contributions = memory[0].memory.contributions.filter(
        (c) => c.user === user1,
      );
      assertEquals(
        user1Contributions.length,
        3,
        "User1 should have 3 contributions",
      );
      assertEquals(
        user1Contributions[0].description,
        "First contribution from User1",
      );
      assertEquals(
        user1Contributions[1].description,
        "Second contribution from User1",
      );
      assertEquals(
        user1Contributions[2].description,
        "Third contribution from User1",
      );
      console.log("   ✓ All 3 contributions from User1 exist");

      // User2 adds contributions too
      console.log("5. User2 adding contributions...");
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "User2 first contribution",
        imageUrls: "user2img1.jpg",
      });
      await memoryConcept.addContribution({
        memory: memoryID,
        user: user2,
        description: "User2 second contribution",
        imageUrls: "user2img2.jpg",
      });

      // Verify total contributions
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(
        memory[0].memory.contributions.length,
        5,
        "Should have 5 total contributions",
      );

      const user2Contributions = memory[0].memory.contributions.filter(
        (c) => c.user === user2,
      );
      assertEquals(
        user2Contributions.length,
        2,
        "User2 should have 2 contributions",
      );
      console.log("   ✓ Total of 5 contributions (3 from User1, 2 from User2)");

      // Test editing specific contribution by index
      console.log("6. Editing User1's second contribution (index 1)...");
      const editResult = await memoryConcept.editContribution({
        memory: memoryID,
        contributionIndex: 1, // User1's second contribution
        user: user1,
        newDescription: "Updated second contribution",
        newImageUrls: "updated1.jpg,updated2.jpg",
      });
      if ("error" in editResult) {
        throw new Error(`Failed to edit contribution: ${editResult.error}`);
      }

      // Verify edit affected only the specific contribution
      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      assertEquals(
        memory[0].memory.contributions[0].description,
        "First contribution from User1",
      );
      assertEquals(
        memory[0].memory.contributions[1].description,
        "Updated second contribution",
      );
      assertEquals(memory[0].memory.contributions[1].imageUrls.length, 2);
      assertEquals(
        memory[0].memory.contributions[2].description,
        "Third contribution from User1",
      );
      console.log("   ✓ Only the specific contribution at index 1 was updated");

      // Test deleting a specific contribution
      console.log("7. Deleting User1's first contribution (index 0)...");
      const deleteResult = await memoryConcept.deleteContribution({
        memory: memoryID,
        contributionIndex: 0, // Delete first contribution
        user: user1,
      });
      if ("error" in deleteResult) {
        throw new Error(`Failed to delete contribution: ${deleteResult.error}`);
      }

      memory = await memoryConcept._getMemory({ memoryID: memoryID });
      const remainingUser1Contributions = memory[0].memory.contributions.filter(
        (c) => c.user === user1,
      );
      assertEquals(
        remainingUser1Contributions.length,
        2,
        "User1 should have 2 contributions left",
      );
      console.log("   ✓ One contribution deleted, 2 remaining for User1");

      console.log("✓ Scenario 7 passed");
    } finally {
      await client.close();
    }
  },
);
```
