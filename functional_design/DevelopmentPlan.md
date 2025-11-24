# Development Plan

## Tasks, Distributions, and Deadlines


## Backend Alpha
| Feature | Task | Assigned To | Deadline |
|:--------|:-----:|:-----:|------:|
| Groups  | Create, Invite, Accept, Decline, queries  | Calvin    | Nov 22    |
| ImageStorage   | All (including queries)  | Kelly    | Nov 23    |
| MemoryEntries | Memory/Contribution/Image Adding and Deleting   | Haolei    | Nov 23    |
| UserAuthentication | All (including queries)   | Lizzy    | Nov 23    |
| MemoryEntries | Proofread concept   | Calvin    | Nov 25    |
| Groups | Proofread concept   | Kelly    | Nov 25    |
| ImageStorage | Proofread concept   | Lizzy    | Nov 25   |
| UserAuthentication | Proofread concept   | Haolei    | Nov 25    |
## Backend Beta
| Feature | Task | Assigned To | Deadline |
|:--------|:-----:|:-----:|------:|
| MemoryEntries  | edit description (contribution), edit title (memory), queries  | Kelly    | Nov 26    |
| Group  | EditingName, LeaveGroup, DeleteGroup  | Kelly    | Nov 26    |
| MemoryEntries  | Proofread concept  | Calvin    | Nov 27    |
| Group  | Proofread concept  | Calvin    | Nov 27    |
| Syncs  | Syncs (UpdateProfilePhotoOnUpload, AddImageToMemoryAfterUploadConfirmation, AuthorizeMemoryCreation,  CascadeUserDeletionToContributions, AuthorizeAddContributionAsGroupMember)  | Lizzy    | Nov 25 Ideally
27 Unideally   |
| Syncs  | Syncs (TBD)  | Calvin    | Nov 29    |
| Syncs  | Syncs (TBD)  | Calvin    | Nov 29    |

## Frontend Alpha
| Page: | Assigned To | Deadline |
|:--------|:-----:|------:|
| ALPHA: Focus on just creating the page, not on visuals or on making buttons actually do things |
| (Creating Vue application) | Lizzy | Nov 25 |
| Homepage | Lizzy | Nov 25 |
| Register/Login | Lizzy | Nov 25 |
| Single Memory | Lizzy | Nov 25 |
| Add/Edit Contribution | Lizzy | Nov 25 |
| Profile | Lizzy | Nov 25 |
| Your Groups | Lizzy | Nov 25 |
| Single Group | Kelly | Nov 25 |
| Create/Edit Memory | Kelly | Nov 25 |
| Create Group | Kelly | Nov 25 |

## Frontend Beta
| Page: | Assigned To | Deadline |
|:--------|:-----:|------:|
| BETA: adding functionality to buttons |
| Homepage | Calvin | Dec 2 |
| Register/Login | Calvin | Dec 2 |
| Single Memory | Calvin | Dec 2 |
| Add/Edit Contribution | Haolei | Dec 2 |
| Profile | Haolei | Dec 2 |
| Your Groups | Haolei | Dec 2 |
| Single Group | Kelly | Dec 2 |
| Create/Edit Memory | Kelly | Dec 2 |
| Create Group | Kelly | Dec 2 |


## Risks and Counterplans
Our implementation design already takes a pretty safe route. For instance, when it comes to deleting a memory, we just leave it up to the original creator of the memory to do so rather than following a democratic process within the group.   

Thus, our main risk is time constraints. We all have busy academic schedules, and many of us also have travel plans over Thanksgiving break that make the project deadlines rather difficult to follow. We did have plans to add an AI summary assistant, but we plan to play this by ear and remove it should time just not be enough.  
