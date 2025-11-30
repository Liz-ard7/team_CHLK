---
timestamp: 'Sat Nov 29 2025 15:57:45 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_155745.f8291025.md]]'
content_id: 2af94315b9ae8628a61eb03d9fd258fb797869381b3bcd91e12cac17c267f7c7
---

# Prompt: Please write the synce for CascadeUserDeletionToGroups

* when
  * UserAuthentication.deleteUser(user)
* where
  * in Groups: user is a member of group
* then
  * Groups.leaveGroup(user, group)
