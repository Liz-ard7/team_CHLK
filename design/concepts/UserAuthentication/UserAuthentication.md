# UserAuthentication

### Purpose
limit access to known users

### Principle
after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user

### State
* A set of users with
    * A username String
    * A password String
    * A userID String (mapped to _id in MongoDB)
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

#### changePhoto (user: User, new_photo: String)
* Requires: user to exist, new_photo to correspond to an existing image, new_photo cannot be empty
* Effects: edits user's profile picture (url) to be new_photo

#### changeBio (user: User, new_bio: String)
* Requires: user to exist, new_bio cannot be empty
* Effects: edits user's bio to be new_bio

### queries

#### _userExists (user: User): (exists: Boolean)
* Requires: user ID to be provided
* Effects: Returns whether a user with the given ID exists in the set of Users
