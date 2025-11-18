## MemoryEntries

### Purpose
Record and organize shared memories within a group, allowing members to collectively contribute photos and descriptions that capture meaningful experiences

### Principle
* Each memory belongs to a specific group and a user
* Members can create a new memory entry, edit its title or description, and add or remove images to reflect shared experiences
* A memory can be viewed by all group members, and only its creator can modify or delete it
* This design ensures that each memory grows through collective input while maintaining clear ownership and editing control

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
#### createMemory (creator: User, group: ID, title: String): (memory: Memory)
* Requires: a group exist and creator is a member of the group
* Effects: create a new memory record linked to the group

#### editTitle(memory: Memory, user: User, group: ID, newTitle: String)
* Requires: memory exists
* Effects: Changes the title of the memory with the given id to newTitle

#### editDescription (memory: Memory, user: User, newDescription: String)
* Requires: a memory created by user-self exist
* Effects: update the memory content

#### addImage(memory: Memory, user: User, imageUrl: String)
* Requires: imageUrl and user are valid
* Effects: Adds a contribution to the set of contributions with the given user and imageUrl

#### deleteImage (memory: Memory, user: User, imageUrl: String)
* Requires: a memory created by user-self exists and user has a contribution entry containing that imageURL
* Effects: removes image from thing

#### deleteMemory (memory: Memory, creator: User)
* Requires: a memory created by user-self exist
* Effects: removes the entire memory and all contributions from the group
