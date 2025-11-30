---
timestamp: 'Sat Nov 29 2025 19:17:10 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_191710.4c207c13.md]]'
content_id: 861e533e6949d5138685cf0a44a2283aa8160f78035dee024de571af47f6d604
---

# problem:

The provided synchronization code has potential TypeScript errors within the `where` clauses. When data is added to a `frame` using `frames.query`, TypeScript types it as `unknown` for safety. Accessing properties on these `unknown` values (e.g., `$[memoryDoc].group` or `$[members].includes(...)`) will result in a compile-time error because their shape is not known.
