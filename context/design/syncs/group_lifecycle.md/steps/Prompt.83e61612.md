---
timestamp: 'Sat Nov 29 2025 16:46:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_164610.be047e35.md]]'
content_id: 83e6161241c6c4bd799e824f0cd2ddfa74f43e69cd3885c18abeaee2263f4699
---

# Prompt: Write the sync for CascadeUserDeletionToGroups

#### sync CascadeUserDeletionToGroups

* when
  * UserAuthentication.deleteUser(user)
* where
  * in Groups: user is a member of group
* then
  * Groups.leaveGroup(user, group)
