---
timestamp: 'Sat Nov 29 2025 16:48:07 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_164807.2bbfd7de.md]]'
content_id: 4c8a97c40acc907012cdf43f5fd21d660b98c899ba767a54dac3b2de81e47091
---

# Prompt: Write the code for these syncs

#### sync DeleteEmptyGroup

* when
  * Groups.leaveGroup(user, group)
* where
  * in Groups: members of group becomesis empty AND invitedMembers of group is empty
* then
  * Groups.deleteGroup(group)

#### sync CascadeGroupDeletionToMemories

* when
  * Groups.deleteGroup(group)
* where
  * in MemoryEntries: group of memory is group
* then
  * MemoryEntries.deleteMemory(memory, creator)
