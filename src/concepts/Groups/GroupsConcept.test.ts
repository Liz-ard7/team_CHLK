import { assertEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import GroupsConcept from "./GroupsConcept.ts";

// Helper IDs for testing
const userA = "user:A" as ID;
const userB = "user:B" as ID;
const userC = "user:C" as ID;

Deno.test("GroupsConcept: editGroupName Action", async (t) => {
  const [db, client] = await testDb();
  const groupsConcept = new GroupsConcept(db);

  await t.step(
    "should allow a member to edit the group name",
    async () => {
      console.log("Trace: createGroup -> editGroupName -> _getGroupDetails");
      console.log(
        "  - Requirement: User is a member of the group.",
      );
      console.log("  - Effect: The group's name is updated.");

      // Setup: Create a group with userA
      const createResult = await groupsConcept.createGroup({
        user: userA,
        name: "Initial Name",
      });
      assertExists(createResult, "createResult should not be null");
      const { group, error: createError } = createResult as {
        group?: ID;
        error?: string;
      };
      assertEquals(createError, undefined);
      assertExists(group);

      // Action: userA edits the group name
      const newName = "Updated Name";
      const editResult = await groupsConcept.editGroupName({
        user: userA,
        group: group,
        new_name: newName,
      });

      // Verification
      assertEquals(
        editResult,
        {},
        "editGroupName should return an empty object on success",
      );
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details.length, 1);
      assertEquals(
        details[0].groupName,
        newName,
        "The group name should be updated",
      );
      console.log("  - Confirmed: Group name updated successfully.");
    },
  );

  await t.step(
    "should generate a name from member IDs if new_name is empty",
    async () => {
      console.log(
        "Trace: createGroup -> invite -> accept -> editGroupName -> _getGroupDetails",
      );
      console.log("  - Requirement: User is a member, new name is empty.");
      console.log("  - Effect: The group's name becomes a list of member IDs.");

      // Setup: Create a group with userA, and userB joins
      const { group } = (await groupsConcept.createGroup({
        user: userA,
        name: "Test Group",
      })) as { group: ID };
      await groupsConcept.inviteMember({
        user: userA,
        group,
        userToInvite: userB,
      });
      await groupsConcept.acceptInvitation({ user: userB, group });

      // Action: userA edits the group name to be empty
      const editResult = await groupsConcept.editGroupName({
        user: userA,
        group: group,
        new_name: "",
      });

      // Verification
      assertEquals(editResult, {});
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details.length, 1);
      const expectedName = [userA, userB].sort().join(", "); // Mongo doesn't guarantee order of $addToSet
      const actualMembers = details[0].members.sort().join(", ");
      assertEquals(
        details[0].groupName,
        actualMembers,
        `Group name should be '${actualMembers}'`,
      );
      console.log(
        `  - Confirmed: Group name set to '${details[0].groupName}'.`,
      );
    },
  );

  await t.step(
    "should fail if a non-member tries to edit the group name",
    async () => {
      console.log("Trace: createGroup -> editGroupName");
      console.log(
        "  - Requirement check: User is NOT a member of the group.",
      );
      console.log("  - Effect: Action returns an error, name is unchanged.");

      // Setup: Create a group with userA
      const initialName = "Original Name";
      const { group } = (await groupsConcept.createGroup({
        user: userA,
        name: initialName,
      })) as { group: ID };

      // Action: userB (non-member) tries to edit
      const editResult = await groupsConcept.editGroupName({
        user: userB,
        group: group,
        new_name: "Attempted Change",
      });

      // Verification
      assertExists((editResult as { error: string }).error);
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details[0].groupName, initialName);
      console.log(
        "  - Confirmed: editGroupName failed as expected, name is unchanged.",
      );
    },
  );

  await client.close();
});

Deno.test("GroupsConcept: leaveGroup Action", async (t) => {
  const [db, client] = await testDb();
  const groupsConcept = new GroupsConcept(db);

  await t.step("should allow a member to leave a group", async () => {
    console.log(
      "Trace: createGroup -> invite -> accept -> leaveGroup -> _getGroupDetails",
    );
    console.log("  - Requirement: User is a member of the group.");
    console.log("  - Effect: User is removed from the group's members list.");

    // Setup: group with userA and userB
    const { group } = (await groupsConcept.createGroup({
      user: userA,
      name: "Two Member Group",
    })) as { group: ID };
    await groupsConcept.inviteMember({
      user: userA,
      group,
      userToInvite: userB,
    });
    await groupsConcept.acceptInvitation({ user: userB, group });

    // Action: userA leaves
    const leaveResult = await groupsConcept.leaveGroup({ user: userA, group });

    // Verification
    assertEquals(leaveResult, {});
    const details = await groupsConcept._getGroupDetails({ groupID: group });
    assertEquals(details.length, 1);
    assertEquals(
      details[0].members.includes(userA),
      false,
      "UserA should be removed",
    );
    assertEquals(
      details[0].members.includes(userB),
      true,
      "UserB should remain",
    );
    assertEquals(details[0].members.length, 1);
    console.log("  - Confirmed: UserA successfully left the group.");
  });

  await t.step("should fail if a non-member tries to leave", async () => {
    console.log("Trace: createGroup -> leaveGroup");
    console.log("  - Requirement check: User is NOT a member of the group.");
    console.log("  - Effect: Action returns an error, members are unchanged.");

    // Setup: group with userA
    const { group } = (await groupsConcept.createGroup({
      user: userA,
      name: "Solo Group",
    })) as { group: ID };

    // Action: userB (non-member) tries to leave
    const leaveResult = await groupsConcept.leaveGroup({ user: userB, group });

    // Verification
    assertExists((leaveResult as { error: string }).error);
    const details = await groupsConcept._getGroupDetails({ groupID: group });
    assertEquals(details[0].members, [userA]);
    console.log(
      "  - Confirmed: leaveGroup failed as expected, members are unchanged.",
    );
  });

  await client.close();
});

Deno.test("GroupsConcept: deleteGroup Action", async (t) => {
  const [db, client] = await testDb();
  const groupsConcept = new GroupsConcept(db);

  await t.step(
    "should allow deletion of an empty group (no members, no invites)",
    async () => {
      console.log(
        "Trace: createGroup -> leaveGroup -> deleteGroup -> _getGroupDetails",
      );
      console.log(
        "  - Requirement: Group has no members and no pending invitations.",
      );
      console.log("  - Effect: The group is removed from the database.");

      // Setup: Create a group, then have the only member leave
      const { group } = (await groupsConcept.createGroup({
        user: userA,
        name: "Temporary Group",
      })) as { group: ID };
      await groupsConcept.leaveGroup({ user: userA, group });

      // Action: Delete the now-empty group
      const deleteResult = await groupsConcept.deleteGroup({ group });

      // Verification
      assertEquals(deleteResult, {});
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details.length, 0, "Group should no longer exist.");
      console.log("  - Confirmed: Empty group was successfully deleted.");
    },
  );

  await t.step(
    "should fail to delete a group that still has members",
    async () => {
      console.log("Trace: createGroup -> deleteGroup");
      console.log("  - Requirement check: Group has members.");
      console.log("  - Effect: Action returns an error, group is not deleted.");

      // Setup: Create a group with one member
      const { group } = (await groupsConcept.createGroup({
        user: userA,
        name: "Active Group",
      })) as { group: ID };

      // Action: Attempt to delete the group
      const deleteResult = await groupsConcept.deleteGroup({ group });

      // Verification
      assertExists((deleteResult as { error: string }).error);
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details.length, 1, "Group should still exist.");
      console.log("  - Confirmed: Deletion failed as expected, group remains.");
    },
  );

  await t.step(
    "should fail to delete a group with pending invitations",
    async () => {
      console.log(
        "Trace: createGroup -> inviteMember -> leaveGroup -> deleteGroup",
      );
      console.log("  - Requirement check: Group has pending invitations.");
      console.log("  - Effect: Action returns an error, group is not deleted.");

      // Setup: Create group, invite someone, then original member leaves
      const { group } = (await groupsConcept.createGroup({
        user: userA,
        name: "Inviting Group",
      })) as { group: ID };
      await groupsConcept.inviteMember({
        user: userA,
        group,
        userToInvite: userB,
      });
      await groupsConcept.leaveGroup({ user: userA, group }); // Group is now empty of members, but has an invite

      // Action: Attempt to delete the group
      const deleteResult = await groupsConcept.deleteGroup({ group });

      // Verification
      assertExists((deleteResult as { error: string }).error);
      const details = await groupsConcept._getGroupDetails({ groupID: group });
      assertEquals(details.length, 1, "Group should still exist.");
      assertEquals(
        details[0].invitedMembers,
        [userB],
        "Pending invitation should remain.",
      );
      console.log("  - Confirmed: Deletion failed as expected, group remains.");
    },
  );

  await client.close();
});
