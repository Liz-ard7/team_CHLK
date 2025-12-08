# Summary of Design Changes

## Conceptual Changes

1. In our Problem Framing assignment, we listed a fourth feature: an AI memory summarizer. Our final design, however, does not include this due to a combination of time constraints and ethical concerns that users may not trust and thus not approve of letting AI have access to their private memories. Certainly, the latter could be solved with an opt-out option, but we did not feel that this feature was absolutely essential.

2. Regarding the notion of contributions, our original design followed the idea that each member of a group was only allowed to make one contribution for any memory shared to that group. However, we later thought that there could be a use case / desire for a user to make multiple contributions for a single memory (e.g the memory is titled to be a bit broad, thus allowing for a lot of sub-memories that a user may want to record individually) and thus changed our design to reflect that. 

3. In our functional design, we removed the idea of being able to propose a vote to kick a member out of a group. Our original intention was to have democracy with regards to removing someone (as just being able to remove someone with no conditions felt easy to abuse), but this created a lot of conceptual complications and has its own ethical concerns that our mentor Iris warned us about. Taking Iris's advice that the notion of inviting users to a group serves as a good starting point for preventing abusive app use, we eliminated all actions in our concepts that involved member vote deletion.

## Visual Changes

This is comparing to the UI sketches that we presented in our functional design.

1. A user's timeline is presented vertically rather than horizontally like the UI sketches. The vertical format better follows the standard format of webpages.

2. Our final app is more structured (with boxes) than our UI sketches that is a bit more disorganized. We figured that this would be more beneficial especially when it comes to larger groups where a single memory could have lots of contributions that would likely be difficult to navigate through if we took a lax approach on structure.