# Syncs


## Deletion

#### sync CascadeUserDeletionToContributions

* when
	* UserAuthentication.deleteUser(deleted_user)
* where
	* in MemoryEntries: memory_M exists AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is deleted_user
* then
	* MemoryEntries.deleteContribution(contribution: contribution_C, user: deleted_user, memory: memory_M)


#### sync CascadeUserDeletionToGroups

* when
	* UserAuthentication.deleteUser(user)
* where
	* in Groups: user is a member of group
* then
	* Groups.leaveGroup(user, group)


#### sync RevokeRemovalVotesOnUserDeletion

* when
	* UserAuthentication.deleteUser(user)
* where
	* in Groups: user is in proponents of vote
* then
	* Groups.rescindVote(user, vote)

## Group Lifecycle


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


#### sync InvalidateVoteOnTargetUserLeave

* when
	* Groups.leaveGroup(user, group)
* where
	* in Groups: flagged user of vote is user AND associated group of vote is group
* then
	* Groups.voteExpire(vote)

## Authorization

#### sync AuthorizeMemoryCreation

* when
	* Request.createMemory(user, group, title)
* where
	* in Groups: user is a member of group
* then
	* MemoryEntries.createMemory(creator: user, group, title)


#### sync AuthorizeGroupInvite

* when
	* Request.inviteMember(user, group, userToInvite)
* where
	* in Groups: user is a member of group
* then
	* Groups.inviteMember(user, group, userToInvite)


#### sync AuthorizeEditMemoryTitle

* when
	* Request.editTitle(user, memory, newTitle)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory
* then
	* MemoryEntries.editTitle(memory, user, group: (group of memory_M), newTitle) sync


#### sync AuthorizeEditMyContributionDescription

* when
	* Request.editContribution(user, contribution, memory, newDescription)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user
* then
	* MemoryEntries.editContribution(contribution, memory, user, newDescription)


#### sync AuthorizeAddContributionAsGroupMember

* when
	* Request.addContribution(user, memory, description)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND group of memory_M is G
	* in Groups: user is a member of G
* then
	* MemoryEntries.addContribution(memory, user, description)


#### sync AuthorizeDeleteMyContribution
* when
	* Request.deleteContribution(user, contribution, memory)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND contribution_C ID is contribution AND user of contribution_C is user
* then
	* MemoryEntries.deleteContribution(contribution, user, memory)


#### sync AuthorizeDeleteMyMemory

* when
	* Request.deleteMemory(user, memory)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND creator of memory_M is user
* then
	* MemoryEntries.deleteMemory(memory, creator: user)

## Image stuff

#### sync UpdateProfilePhotoOnUpload

* when
	* ImageStorage.confirmUpload(user, object) : (file, url)
	* Request.forProfilePhoto(user, object) // A marker that this upload was for a profile photo
* then
	* UserAuthentication.changePhoto(user, new_photo: url)


#### sync RequestMemoryImageUploadUrl

* when
	* Request.request(path: "/memory-images/upload-url", user, memory, filename, contentType) : (req_id)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND group of memory_M is G
	* in Groups: user is a member of G
* then
	* ImageStorage.requestUploadUrl(user, filename, contentType) : (uploadUrl, bucket, object)
	* Request.respond(request: req_id, uploadUrl, bucket, object, memory, user)

#### sync AddImageToMemoryAfterUploadConfirmation

* when
	* ImageStorage.confirmUpload(user, object) : (file, url)
	* Request.request(path: "/memory-images/upload-url", user, memory, filename, contentType) : (req_id) // Match the initial request
* then
	* MemoryEntries.addImage(memory, user, contribution, imageUrl: url)
	* Request.respond(request: req_id, status: "success", imageUrl: url)


#### sync AuthorizeDeleteImageFromMemory

* when
	* Request.deleteImage(user, memory, contribution, imageUrl)
* where
	* in MemoryEntries: memory_M exists and memory_M ID is memory AND contribution_C exists in memory_M's set of contributions AND user of contribution_C is user AND contribution_C's imageUrls contains imageUrl
* then
	* MemoryEntries.deleteImage(memory, user, contribution, imageUrl)
