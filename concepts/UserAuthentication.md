## UserAuthentication

### Purpose
limit access to known users

### Principle
after a user registers with a username and a password, they can authenticate with that same username and password and be treated each time as the same user

### State
* A set of users with
    * A username String
    * A password String
    * A userID String
    * A profile photo URL String
    * A bio String

### Actions
#### register (username: String, password: String): (user: User)
* Requires: username to not already exist in the set of Users
* Effects:  creates a new user of that username and password + with a randomly generated unique user ID, adds that user to the set of users, and returns the new user

#### authenticate (username: String, password: String): (user: User)
* Requires: user of the argument username and password to exist in the set of Users
* Effects: returns the corresponding User

#### deleteUser (user: User)
* Requires: user to exist
* Effects: removes user from the set of existing users

#### changePhoto (user: User, new_photo: String)
* Requires: user to exist, new_photo to correspond to an existing image
* Effects: edits user’s profile picture to be new_photo

#### changeBio (user: User, new_bio: String)
* Requires: user to exist
* Effects: edits user’s bio to be new_bio
