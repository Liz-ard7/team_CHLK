---
timestamp: 'Sat Nov 29 2025 15:16:46 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_151646.8e5180e0.md]]'
content_id: eccded4cf348c9b7fc9f7701d6094fb8221c0139f85a3fea5aadfe94ef6844a0
---

# file: deno.json

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@concepts": "./src/concepts/concepts.ts",
        "@std/assert": "jsr:@std/assert@^1.0.16",
        "@test-concepts": "./src/concepts/test_concepts.ts",
        "@utils/": "./src/utils/",
        "@engine": "./src/engine/mod.ts",
        "@syncs": "./src/syncs/syncs.ts"
    },
    "tasks": {
        "start": "deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts",
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api",
        "import": "deno run --allow-read --allow-write --allow-env src/utils/generate_imports.ts",
        "build": "deno run import"
    },
    "lint": {
        "rules": {
            "exclude": [
                "no-import-prefix",
                "no-unversioned-import"
            ]
        }
    }
}
```
