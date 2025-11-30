---
timestamp: 'Sat Nov 29 2025 16:46:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_164639.36aaa63d.md]]'
content_id: ade141e282cac46c4e8d6b0079045d44bc71abd02550822f7584019b73a82edd
---

# sync: CascadeUserDeletionToGroups

* **when**: `UserAuthentication.deleteUser(user)`
* **where**: in `Groups`: `user` is a member of `group`
* **then**: `Groups.leaveGroup(user, group)`
