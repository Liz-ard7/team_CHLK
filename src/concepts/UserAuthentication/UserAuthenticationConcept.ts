// file: src/UserAuthentication/UserAuthenticationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "UserAuthentication" + ".";

/**
 * The User type represents the identity of a registered user.
 * It's treated polymorphically by the concept, meaning its internal
 * structure beyond being a unique identifier is not assumed.
 */
export type User = ID;

/**
 * State:
 * a set of Users with
 *   a username String
 *   a password String
 *   a url String
 *   a bio String
 *
 * Represents the collection of registered users, each with a unique
 * username and an associated password.
 */
interface UserDoc {
  _id: User;
  username: string;
  password: string;
  url: string;
  bio: string;
}

/**
 * **concept** UserAuthentication
 *
 * **purpose** limit access to stories to known users
 *
 * **principle** after a user registers with a username and a password,
 * they can authenticate with that same username and password
 * and be treated each time as the same user
 */
export default class UserAuthenticationConcept {
  private users: Collection<UserDoc>;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  /**
   * **register** (username: String, password: String): (user)
   *
   * **requires** the username does not exist
   * **effects** creates a new User with the username username and password password,
   *             adds it to the set of Users, then returns it
   *
   * Registers a new user with the given username and password.
   * If the username already exists, an error is returned.
   */
  async register(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check if username already exists (requires condition)
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: "Username already exists." };
    }

    // Effects: create and insert new user
    const newUser: UserDoc = {
      _id: freshID() as User, // Generate a fresh ID for the new user
      username,
      password,
      url: "team_CHLK/src/concepts/image.png",
      bio: "",
    };

    const result = await this.users.insertOne(newUser);
    if (!result.acknowledged) {
      return { error: "Failed to register user." };
    }

    return { user: newUser._id };
  }

  /**
   * **authenticate** (username: String, password: String): (user)
   *
   * **requires** requires the username to exist in the set of Users
   *             and for said user to have a matching username and password
   * **effects** returns the User associated with the username and password
   *
   * Authenticates a user with the given username and password.
   * Returns the user's ID if credentials are valid, otherwise returns an error.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check if username exists and password matches (requires condition)
    const foundUser = await this.users.findOne({ username, password }); // Again, a real app would hash and compare.

    if (!foundUser) {
      return { error: "Invalid username or password." };
    }

    // Effects: return the authenticated user's ID
    return { user: foundUser._id };
  }

  /**
   * **deleteUser** (username: String, password: String): (user)
   *
   * **requires** the username and the password must match for a user in the set of Users
   * **effects** finds the user that matches with the username and password,
   *             removes the user from the set of Users and returns it
   *
   * Deletes a user from the system. Requires valid username and password for confirmation.
   * Returns the ID of the deleted user, or an error if credentials are invalid.
   */
  async deleteUser(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // Check if username and password match an existing user (requires condition)
    const userToDelete = await this.users.findOne({ username, password });

    if (!userToDelete) {
      return { error: "Invalid username or password." };
    }

    // Effects: delete the user
    const result = await this.users.deleteOne({ _id: userToDelete._id });

    if (result.deletedCount === 0) {
      // This case should theoretically not happen if findOne found it,
      // but good for robustness.
      return { error: "Failed to delete user." };
    }

    return { user: userToDelete._id };
  }

  /**
   * _userExists (user: ID): ({ exists: boolean })
   *
   * Query to check if a user with the given ID exists in the authentication store.
   * Useful for guarded routes in other concepts (e.g., Library.addUser).
   */
  async _userExists(
    { user }: { user: User },
  ): Promise<{ exists: boolean }> {
    const found = await this.users.findOne({ _id: user });
    return { exists: !!found };
  }

  /**
   * _getUserByUsername (username: String): ({ userId: User | null })
   *
   * Query to get a user's ID by their username.
   * Returns null for userId if user not found.
   */
  async _getUserByUsername(
    { username }: { username: string },
  ): Promise<Array<{ userId: User | null }>> {
    const found = await this.users.findOne({ username });
    return [{ userId: found ? found._id : null }];
  }

  /**
   * changePhoto (user: User, new_photo: String)
   *
   * Requires: user to exist, new_photo to correspond to an existing image
   * Effects: edits user’s profile picture to be new_photo
   */
  async changePhoto(
    { user, new_photo }: { user: User; new_photo: string },
  ): Promise<Empty | { error: string }> {
    const found = await this.users.findOne({ _id: user });
    if (!found) {
      return { error: "User does not exist." };
    } else if (new_photo === "") {
      return { error: "New photo URL cannot be empty." };
    }

    await this.users.updateOne(
      { _id: user },
      { $set: { url: new_photo } },
    );

    return {};
  }

  /**
   * changeBio (user: User, new_bio: String)
   *
   * Requires: user to exist
   * Effects: edits user’s bio to be new_bio
   */
  async changeBio(
    { user, new_bio }: { user: User; new_bio: string },
  ): Promise<Empty | { error: string }> {
    const found = await this.users.findOne({ _id: user });
    if (!found) {
      return { error: "User does not exist." };
    } else if (new_bio === "") {
      return { error: "New bio cannot be empty." };
    }

    await this.users.updateOne(
      { _id: user },
      { $set: { bio: new_bio } },
    );

    return {};
  }
}
