---
timestamp: 'Wed Dec 03 2025 18:10:53 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251203_181053.e07008dd.md]]'
content_id: b1f2c29101dd43e6894946ded62ebc5f6d592da021433d5364bbeb5561856c51
---

# file: src/concepts/userauthentication/UserAuthenticationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { ID, Empty } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "UserAuthentication.";

// Generic types for this concept
type User = ID;

/**
 * A set of users with
 *  A username String
 *  A password String
 *  A userID String (mapped to _id in MongoDB)
 *  A url String (profile photo URL)
 *  A bio String
 */
interface Users {
  _id: User;
  username: string;
  password: string;
  url: string;
  bio: string;
}

/**
 * Concept: UserAuthentication
 *
 * Purpose:
 * limit access to known users
 *
 * Principle:
 * after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user
 */
export default class UserAuthenticationConcept {
  users: Collection<Users>;

  constructor(private readonly db: Db) {
    this.users = db.collection<Users>(PREFIX + "users");
  }

  /**
   * register (username: String, password: String): (user: User)
   *
   * requires: username to not already exist in the set of Users
   * effects: creates a new user of that username and password + with a randomly generated unique user ID. Profile photo (url) and bio of the new user are blank. Adds that user to the set of users, and returns the new user
   */
  async register({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `User with username '${username}' already exists.` };
    }

    const newUser: Users = {
      _id: freshID() as User,
      username,
      password,
      url: "",
      bio: "",
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * authenticate (username: String, password: String): (user: User)
   *
   * requires: user of the argument username and password to exist in the set of Users
   * effects: returns the corresponding User
   */
  async authenticate({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username, password });
    if (!user) {
      return { error: "Invalid username or password." };
    }
    return { user: user._id };
  }

  /**
   * deleteUser (username: String, password: String): (user: User)
   *
   * requires: username and password must match for a user in the set of Users
   * effects: finds the user that matches with the username and password, removes the user from the set of Users and returns the user ID
   */
  async deleteUser({ username, password }: { username: string; password: string }): Promise<{ user: User } | { error: string }> {
    const user = await this.users.findOne({ username, password });
    if (!user) {
      return { error: "Invalid username or password." };
    }
    await this.users.deleteOne({ _id: user._id });
    return { user: user._id };
  }

  /**
   * changePhoto (user: User, new_photo: String)
   *
   * requires: user to exist, new_photo to correspond to an existing image, new_photo cannot be empty
   * effects: edits user's profile picture (url) to be new_photo
   */
  async changePhoto({ user, new_photo }: { user: User; new_photo: string }): Promise<Empty | { error: string }> {
    if (!new_photo) {
      return { error: "New photo URL cannot be empty." };
    }

    const result = await this.users.updateOne({ _id: user }, { $set: { url: new_photo } });

    if (result.matchedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }

  /**
   * changeBio (user: User, new_bio: String)
   *
   * requires: user to exist, new_bio cannot be empty
   * effects: edits user's bio to be new_bio
   */
  async changeBio({ user, new_bio }: { user: User; new_bio: string }): Promise<Empty | { error: string }> {
    if (!new_bio) {
      return { error: "New bio cannot be empty." };
    }

    const result = await this.users.updateOne({ _id: user }, { $set: { bio: new_bio } });

    if (result.matchedCount === 0) {
      return { error: "User not found." };
    }

    return {};
  }

  /**
   * _userExists (user: User): (exists: Boolean)
   *
   * requires: user ID to be provided
   * effects: Returns whether a user with the given ID exists in the set of Users
   */
  async _userExists({ user }: { user: User }): Promise<{ exists: boolean }[]> {
    const count = await this.users.countDocuments({ _id: user });
    return [{ exists: count > 0 }];
  }

  /**
   * _getUsername (user: User): (username: string)
   *
   * requires: user ID to be provided, user ID corresponds with actual user
   * effects: returns username of the user of that ID
   */
  async _getUsername({ user }: { user: User }): Promise<{ username: string }[]> {
    const foundUser = await this.users.findOne({ _id: user });
    if (!foundUser) {
      return [];
    }
    return [{ username: foundUser.username }];
  }
}
```
