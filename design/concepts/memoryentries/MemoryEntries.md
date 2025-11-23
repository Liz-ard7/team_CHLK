# MemoryEntries

### Purpose
Record and organize shared memories within a group, allowing members to collectively contribute photos and descriptions that capture meaningful experiences

### Principle
* Each memory belongs to a specific group and a user
* Members can create a new memory entry, edit its title or description, and add or remove images to reflect shared experiences
* A memory can be viewed by all group members. Group members can edit the title of the memory and add their own individual descriptions (textual and visual). Only the creator of the memory can delete the memory.
* This design ensures that each memory grows through collective input while maintaining clear ownership and editing control
* Each memory has a creator, and group members can add their own contributions (descriptions and images). Users can edit or delete their own contributions.

### State
* A set of Memories with
    * Memory ID String
    * A group (given as ID)
    * A creator User
    * A title String
    * A set of Contributions with
        * A set of imageUrls String
        * A description String
        * An associated user User

### Actions
#### createMemory (creator: User, group: String, title: String): (memory: Memory)
* Requires: the creator and group to exist, creator is a member of the group, title is non-empty
* Effects: create a new memory record with the parameter title, and an empty set of contributions, and a randomly generated ID linked to the group.

#### editTitle(memory: Memory, user: User, newTitle: String)
* Requires: user, memory, and group to exist. user is within the group that the memory is in. newTitle is non-empty
* Effects: Changes the title of the memory with the given id to newTitle

#### editContribution (memory: Memory, user: User, newDescription: String)
* Requires: memory and user to exist, user is within the group that the memory is in, newDescription cannot be empty, user has an existing contribution for this memory
* Effects: update the contribution's description of the user for the particular memory to be newDescription

#### addContribution(memory: Memory, user: User, description: String, imageUrls: String)
* Requires: user to be a member of the group associated with memory, description cannot be empty
* Effects: add a new contribution with the User user, split the imageUrls string (comma-separated) into a set of imageUrl strings, and description as description. Add this contribution to the memory's set of contributions. If the user already has a contribution for this memory, update the existing contribution instead.

#### deleteContribution(memory: Memory, user: User)
* Requires: memory and user to exist, user has an existing contribution within the memory's set of contributions
* Effects: remove the contribution associated with the user from memory's set of contributions

#### addImage(user: User, memory: Memory, imageUrl: String)
* Requires: user and memory to exist, user is associated with a contribution in memory, imageUrl corresponds to an existing image
* Effects: Adds image to the set of images within the user's contribution for this memory

#### deleteImage (user: User, memory: Memory, imageUrl: String)
* Requires: user and memory to exist, user is associated with a contribution in memory, the contribution contains the parameter imageUrl
* Effects: removes image from the user's contribution for this memory

#### deleteMemory (memory: Memory, creator: User)
* Requires: a memory created by user-self exists
* Effects: removes the entire memory from the group, removes all contributions associated with that memory

### queries

#### _getMemory (memoryID: String): (memory: Memory)
* Requires: memoryID exists, and the requesting user (if any) is a member of the associated group (implied security context, possibly via syncs).
* Effects: Returns the full memory object.

#### _listMemoriesForGroup (groupID: String): (memories: Set<Memory>)
* Requires: `groupID` exists, and the requesting user is a member of `groupID`.
* Effects: Returns a set of memory objects for the specified group.
