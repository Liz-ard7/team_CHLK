# UserAuthentication Concept Test Output

## Test Execution Results

```
running 1 test from ./src/concepts/UserAuthentication/UserAuthenticationConcept.test.ts
UserAuthentication Concept Testing ...
  trace: Operational Principle ...
------- output -------

--- Operational Principle: Register and Authenticate ---
Registering "alice": { user: "019abd23-2566-7c81-9de7-9bdd366d559d" }
Authenticating "alice" (1st time): { user: "019abd23-2566-7c81-9de7-9bdd366d559d" }
Authenticating "alice" (2nd time): { user: "019abd23-2566-7c81-9de7-9bdd366d559d" }
Operational Principle trace completed successfully.
----- output end -----
  trace: Operational Principle ... ok (123ms)
  Interesting Scenario 1: Register with existing username ...
------- output -------

--- Scenario 1: Register with existing username ---
Registering "bob" (1st time): { user: "019abd23-25e3-724f-b09f-d13c1968bde5" }
Registering "bob" (2nd time): { error: "Username already exists." }
Authenticating "bob" with original pass: { user: "019abd23-25e3-724f-b09f-d13c1968bde5" }
----- output end -----
  Interesting Scenario 1: Register with existing username ... ok (104ms)
  Interesting Scenario 2: Authentication failure cases ...
------- output -------

--- Scenario 2: Authentication failure cases ---
Registering "charlie": { user: "019abd23-2653-7e2a-9997-1f807cd44f1d" }
Authenticating "charlie" with wrong password: { error: "Invalid username or password." }
Authenticating "nonexistent" with correct password (for Charlie): { error: "Invalid username or password." }
Authenticating "charlie" with correct password: { user: "019abd23-2653-7e2a-9997-1f807cd44f1d" }
----- output end -----
  Interesting Scenario 2: Authentication failure cases ... ok (140ms)
  Interesting Scenario 3: Delete user successfully ...
------- output -------

--- Scenario 3: Delete user successfully ---
Registering "diana": { user: "019abd23-26df-7b33-bdef-7c6b778e595a" }
Authenticating "diana" before deletion: { user: "019abd23-26df-7b33-bdef-7c6b778e595a" }
Deleting "diana": { user: "019abd23-26df-7b33-bdef-7c6b778e595a" }
Authenticating "diana" after deletion: { error: "Invalid username or password." }
Deleting "diana" again: { error: "Invalid username or password." }
----- output end -----
  Interesting Scenario 3: Delete user successfully ... ok (202ms)
  Interesting Scenario 4: Delete user with incorrect credentials ...
------- output -------

--- Scenario 4: Delete user with incorrect credentials ---
Registering "eve": { user: "019abd23-27a2-7e8f-84ee-118828499516" }
Attempting to delete "eve" with wrong password: { error: "Invalid username or password." }
Authenticating "eve" with correct password: { user: "019abd23-27a2-7e8f-84ee-118828499516" }
----- output end -----
  Interesting Scenario 4: Delete user with incorrect credentials ... ok (104ms)
  Interesting Scenario 5: Check if user exists ...
------- output -------

--- Scenario 5: Check if user exists ---
Registering "frank": { user: "019abd23-280b-74a5-b5ff-29fb7a430735" }
Checking if "frank" exists: { exists: true }
Checking if fake user exists: { exists: false }
Deleted "frank"
Checking if "frank" exists after deletion: { exists: false }
----- output end -----
  Interesting Scenario 5: Check if user exists ... ok (200ms)
  Interesting Scenario 6: Change user photo ...
------- output -------

--- Scenario 6: Change user photo ---
Registering "grace": { user: "019abd23-28d4-712f-b695-3b7d8a1ddcfb" }
Changing "grace"'s photo: {}
Attempting to change photo to empty URL: { error: "New photo URL cannot be empty." }
Attempting to change photo for non-existent user: { error: "User does not exist." }
----- output end -----
  Interesting Scenario 6: Change user photo ... ok (176ms)
  Interesting Scenario 7: Change user bio ...
------- output -------

--- Scenario 7: Change user bio ---
Registering "henry": { user: "019abd23-2984-79f9-847d-77a4b99aefb3" }
Changing "henry"'s bio: {}
Attempting to change bio to empty string: { error: "New bio cannot be empty." }
Attempting to change bio for non-existent user: { error: "User does not exist." }
----- output end -----
  Interesting Scenario 7: Change user bio ... ok (166ms)
UserAuthentication Concept Testing ... ok (2s)

ok | 1 passed (8 steps) | 0 failed (2s)
```

## Test Results Summary

**All tests passed successfully!**

### Test Coverage

1. **Operational Principle Test** ✓
   - Register user with username and password
   - Authenticate user multiple times
   - Verify same user ID is returned each time
   - **Status**: PASSED

2. **Scenario 1: Register with existing username** ✓
   - Attempt to register duplicate username
   - Verify original user can still authenticate
   - **Status**: PASSED

3. **Scenario 2: Authentication failure cases** ✓
   - Wrong password authentication
   - Non-existent username authentication
   - Verify correct authentication still works
   - **Status**: PASSED

4. **Scenario 3: Delete user successfully** ✓
   - Delete user with correct credentials
   - Verify user cannot authenticate after deletion
   - Verify cannot delete already-deleted user
   - **Status**: PASSED

5. **Scenario 4: Delete user with incorrect credentials** ✓
   - Attempt to delete with wrong password
   - Verify user still exists and can authenticate
   - **Status**: PASSED

6. **Scenario 5: Check if user exists** ✓
   - Check existence of registered user
   - Check existence of non-existent user
   - Check existence after deletion
   - **Status**: PASSED

7. **Scenario 6: Change user photo** ✓
   - Change photo successfully
   - Attempt to change to empty URL (should fail)
   - Attempt to change for non-existent user (should fail)
   - **Status**: PASSED

8. **Scenario 7: Change user bio** ✓
   - Change bio successfully
   - Attempt to change to empty string (should fail)
   - Attempt to change for non-existent user (should fail)
   - **Status**: PASSED

### All Actions Tested

- ✓ `register` - Tested in all scenarios
- ✓ `authenticate` - Tested in Operational Principle and Scenarios 1-4
- ✓ `deleteUser` - Tested in Scenarios 3-4
- ✓ `changePhoto` - Tested in Scenario 6
- ✓ `changeBio` - Tested in Scenario 7

### All Queries Tested

- ✓ `_userExists` - Tested in Scenario 5

**Total execution time**: 2 seconds  
**Test result**: All tests passed successfully (1 test with 8 steps, all passed)

