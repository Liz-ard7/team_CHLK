<<<<<<< HEAD
import { assert, assertEquals, assertNotEquals } from "jsr:@std/assert";
=======
import { assertEquals, assertExists } from "jsr:@std/assert";
>>>>>>> cde268cdd4562f9da4ba9460eccd7072a23ced13
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import GroupsConcept from "./GroupsConcept.ts";

<<<<<<< HEAD
Deno.test("Groups Concept", async (t) => {
  const [db, client] = await testDb();
  const groups = new GroupsConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const userCharlie = "user:Charlie" as ID;

  await t.step("Action: createGroup", async (t) => {
    await t.step("should create a new group with a given name", async () => {
      console.log("  - Trace: Alice creates 'Book Club'");
      const result = await groups.createGroup({
        user: userAlice,
        name: "Book Club",
      });
      assert("group" in result, "Expected a group ID to be returned");

      const [details] = await groups._getGroupDetails({
        groupID: result.group,
      });
      assertEquals(details.groupName, "Book Club");
      assertEquals(details.members, [userAlice]);
      assertEquals(details.invitedMembers, []);
    });

    await t.step(
      "should create a group with user ID as name if name is empty",
      async () => {
        console.log("  - Trace: Bob creates a group with no name");
        const result = await groups.createGroup({ user: userBob, name: "  " }); // Test with whitespace
        assert("group" in result, "Expected a group ID to be returned");

        const [details] = await groups._getGroupDetails({
          groupID: result.group,
        });
        assertEquals(details.groupName, userBob);
        assertEquals(details.members, [userBob]);
      },
    );
  });

  await t.step("Action: inviteMember", async (t) => {
    console.log("  - Setup: Alice creates a group 'Coders Anonymous'");
    const createResult = await groups.createGroup({
      user: userAlice,
      name: "Coders Anonymous",
    });
    assert("group" in createResult);
    const groupId = createResult.group;

    await t.step("should allow a member to invite another user", async () => {
      console.log("  - Trace: Alice invites Bob");
      const result = await groups.inviteMember({
        user: userAlice,
        group: groupId,
        userToInvite: userBob,
      });
      assertEquals(result, {}, "Expected success (empty object)");

      const [details] = await groups._getGroupDetails({ groupID: groupId });
      assertEquals(details.invitedMembers, [userBob]);
    });

    await t.step(
      "should return an error if inviter is not a member",
      async () => {
        console.log("  - Trace: Charlie (non-member) tries to invite someone");
        const result = await groups.inviteMember({
          user: userCharlie,
          group: groupId,
          userToInvite: userBob,
        });
        assert("error" in result);
        assertEquals(
          result.error,
          "Permission denied: Only group members can invite others.",
        );
      },
    );

    await t.step(
      "should return an error if invitee is already a member",
      async () => {
        console.log("  - Trace: Alice tries to invite herself");
        const result = await groups.inviteMember({
          user: userAlice,
          group: groupId,
          userToInvite: userAlice,
        });
        assert("error" in result);
        assertEquals(result.error, "User is already a member of the group.");
      },
    );

    await t.step(
      "should succeed idempotently if user is already invited",
      async () => {
        console.log("  - Trace: Alice invites Bob again");
        const result = await groups.inviteMember({
          user: userAlice,
          group: groupId,
          userToInvite: userBob,
        });
        assertEquals(result, {}, "Expected success (empty object)");
        const [details] = await groups._getGroupDetails({ groupID: groupId });
        assertEquals(
          details.invitedMembers,
          [userBob],
          "Invited members should not change",
        );
      },
    );
  });

  await t.step("Actions: acceptInvitation and declineInvitation", async (t) => {
    console.log(
      "  - Setup: Alice creates 'Gamers Guild', invites Bob and Charlie",
    );
    const createResult = await groups.createGroup({
      user: userAlice,
      name: "Gamers Guild",
    });
    assert("group" in createResult);
    const groupId = createResult.group;
    await groups.inviteMember({
      user: userAlice,
      group: groupId,
      userToInvite: userBob,
    });
    await groups.inviteMember({
      user: userAlice,
      group: groupId,
      userToInvite: userCharlie,
    });

    await t.step(
      "should allow an invited user to accept an invitation",
      async () => {
        console.log("  - Trace: Bob accepts the invitation");
        const result = await groups.acceptInvitation({
          user: userBob,
          group: groupId,
        });
        assertEquals(result, {});

        const [details] = await groups._getGroupDetails({ groupID: groupId });
        assert(details.members.includes(userBob), "Bob should be a member");
        assert(
          !details.invitedMembers.includes(userBob),
          "Bob should be removed from invited list",
        );
      },
    );

    await t.step(
      "should allow an invited user to decline an invitation",
      async () => {
        console.log("  - Trace: Charlie declines the invitation");
        const result = await groups.declineInvitation({
          user: userCharlie,
          group: groupId,
        });
        assertEquals(result, {});

        const [details] = await groups._getGroupDetails({ groupID: groupId });
        assert(
          !details.members.includes(userCharlie),
          "Charlie should not be a member",
        );
        assert(
          !details.invitedMembers.includes(userCharlie),
          "Charlie should be removed from invited list",
        );
      },
    );

    await t.step(
      "should return an error if a non-invited user tries to accept",
      async () => {
        console.log(
          "  - Trace: A user not invited tries to accept (Charlie, after declining)",
        );
        const result = await groups.acceptInvitation({
          user: userCharlie,
          group: groupId,
        });
        assert("error" in result);
        assertEquals(result.error, "User has not been invited to this group.");
      },
    );
  });

  await t.step("Principle Test: Full user collaboration flow", async () => {
    console.log(
      "Principle: Users create groups, invite others, and manage membership consensually.",
    );
    // 1. User creates a group.
    console.log("  - Trace 1: Alice creates a group 'Study Group'");
    const createRes = await groups.createGroup({
      user: userAlice,
      name: "Study Group",
    });
    assert("group" in createRes);
    const groupId = createRes.group;

    // 2. Group owner invites friends.
    console.log("  - Trace 2: Alice invites Bob and Charlie");
    await groups.inviteMember({
      user: userAlice,
      group: groupId,
      userToInvite: userBob,
    });
    await groups.inviteMember({
      user: userAlice,
      group: groupId,
      userToInvite: userCharlie,
    });

    // 3. Invitations ensure membership is consensual.
    console.log("  - Trace 3: Bob accepts, Charlie declines");
    await groups.acceptInvitation({ user: userBob, group: groupId });
    await groups.declineInvitation({ user: userCharlie, group: groupId });

    // 4. Verify state: Only group members can participate.
    console.log(
      "  - Trace 4: Verifying final group state and user group lists",
    );
    const [finalDetails] = await groups._getGroupDetails({ groupID: groupId });
    assertEquals(finalDetails.members.length, 2);
    assert(finalDetails.members.includes(userAlice));
    assert(finalDetails.members.includes(userBob));
    assertEquals(finalDetails.invitedMembers, []);

    const [aliceGroups] = await groups._listGroupsForUser({ user: userAlice });
    assert(aliceGroups.groups.includes(groupId));

    const [bobGroups] = await groups._listGroupsForUser({ user: userBob });
    assert(bobGroups.groups.includes(groupId));

    const [charlieGroups] = await groups._listGroupsForUser({
      user: userCharlie,
    });
    assert(!charlieGroups.groups.includes(groupId));
    console.log("Principle successfully demonstrated.");
=======
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
>>>>>>> cde268cdd4562f9da4ba9460eccd7072a23ced13
  });

  await client.close();
});
<<<<<<< HEAD
=======

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
>>>>>>> cde268cdd4562f9da4ba9460eccd7072a23ced13
