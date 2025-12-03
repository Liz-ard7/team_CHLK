---
timestamp: 'Wed Dec 03 2025 18:10:53 GMT-0500 (Eastern Standard Time)'
parent: '[[../20251203_181053.e07008dd.md]]'
content_id: 86860c92a6893b03502da98d9f92e9bd397b1c423a4289cbd71c367cb57d5489
---

# concept: UserAuthentication

### Purpose

limit access to known users

### Principle

after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user

### State

* A set of users with
  * A username String
  * A password String
  * A userID String (mapped to \_id in MongoDB)
  * A url String (profile photo URL)
  * A bio String

### Actions

#### register (username: String, password: String): (user: User)

* Requires: username to not already exist in the set of Users
* Effects: creates a new user of that username and password + with a randomly generated unique user ID. Profile photo (url) and bio of the new user are blank. Adds that user to the set of users, and returns the new user

#### authenticate (username: String, password: String): (user: User)

* Requires: user of the argument username and password to exist in the set of Users
* Effects: returns the corresponding User

#### deleteUser (username: String, password: String): (user: User)

* Requires: username and password must match for a user in the set of Users
* Effects: finds the user that matches with the username and password, removes the user from the set of Users and returns the user ID

#### changePhoto (user: User, new\_photo: String)

* Requires: user to exist, new\_photo to correspond to an existing image, new\_photo cannot be empty
* Effects: edits user's profile picture (url) to be new\_photo

#### changeBio (user: User, new\_bio: String)

* Requires: user to exist, new\_bio cannot be empty
* Effects: edits user's bio to be new\_bio

### queries

#### \_userExists (user: User): (exists: Boolean)

* Requires: user ID to be provided
* Effects: Returns whether a user with the given ID exists in the set of Users

#### \_getUsername (user: User): (username: string)

* Requires: user ID to be provided, user ID corresponds with actual user
* Effects: returns username of the user of that ID
