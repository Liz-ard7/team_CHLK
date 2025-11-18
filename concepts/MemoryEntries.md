## MemoryEntries

### Purpose
Record and organize shared memories within a group, allowing members to collectively contribute photos and descriptions that capture meaningful experiences

### Principle
* Each memory belongs to a specific group and a user
* Members can create a new memory entry, edit its title or description, and add or remove images to reflect shared experiences
* A memory can be viewed by all group members. Group members can edit the title of the memory and add their own individual descriptions (textual and visual). Only the creator of the memory can delete the memory.
* This design ensures that each memory grows through collective input while maintaining clear ownership and editing control

### State
* A set of Memories with
    * Memory ID String
    * A group (given as ID)
    * A creator User
    * A title String
* A set of Contributions with
    * An associated memory ID String
    * A set of imageUrls String
    * A description String
    * An associated user User

### Actions
#### createMemory (creator: User, group: String, title: String): (memory: Memory)
* Requires: the creator and group to exist, creator is a member of the group, title is non-empty
* Effects: create a new memory record with the parameter title and a randomly generated ID linked to the group. Initialize a Contribution for each member within the group with an empty set of images and an empty description.

#### editTitle(memory: Memory, user: User, newTitle: String)
* Requires: user, memory, and group to exist. user is within the group that the memory is in. newTitle is non-empty
* Effects: Changes the title of the memory with the given id to newTitle

#### editDescription (memory: Memory, user: User, newDescription: String)
* Requires: memory and user to exist, user is within the group that the memory is in
* Effects: update the textual memory content of the user for the particular memory

#### addImage(user: User, contribution: Contribution, imageUrl: String)
* Requires: user and contribution to exist, user is associated with the given contribution, imageUrl corresponds to an existing image
* Effects: Adds image to the set of images within the contribution

#### deleteImage (user: User, contribution: Contribution, imageUrl: String)
* Requires: user and contribution to exist, user is associated with the given contribution, contribution contains the parameter imageURL
* Effects: removes image from user's contribution

#### deleteMemory (memory: Memory, creator: User)
* Requires: a memory created by user-self exists
* Effects: removes the entire memory from the group, removes all contributions associated with that memory
