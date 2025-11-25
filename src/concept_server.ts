import { Hono } from "jsr:@hono/hono";
import { cors } from "jsr:@hono/hono/cors";
import { getDb } from "@utils/database.ts";
import { walk } from "jsr:@std/fs";
import { parseArgs } from "jsr:@std/cli/parse-args";
import { toFileUrl } from "jsr:@std/path/to-file-url";

// Parse command-line arguments for port and base URL
const flags = parseArgs(Deno.args, {
  string: ["port", "baseUrl"],
  default: {
    port: "8000",
    baseUrl: "/api",
  },
});

const PORT = parseInt(flags.port, 10);
const BASE_URL = flags.baseUrl;
const CONCEPTS_DIR = "src/concepts";

/**
 * Main server function to initialize DB, load concepts, and start the server.
 */
async function main() {
  const [db] = await getDb();
  const app = new Hono();

  // Enable CORS for all routes
  app.use("*", cors({
    origin: "http://localhost:5173", // Your frontend URL
    credentials: true,
  }));

  app.get("/", (c) => c.text("Concept Server is running."));

  // --- Dynamic Concept Loading and Routing ---
  console.log(`Scanning for concepts in ./${CONCEPTS_DIR}...`);

  for await (
    const entry of walk(CONCEPTS_DIR, {
      maxDepth: 1,
      includeDirs: true,
      includeFiles: false,
    })
  ) {
    if (entry.path === CONCEPTS_DIR) continue; // Skip the root directory

    const folderName = entry.name;

    // Try to find the concept file - try multiple naming patterns
    let conceptFilePath: string | null = null;
    let conceptApiName: string | null = null;

    // Pattern 1: Capitalize first letter (e.g., groups -> GroupsConcept.ts)
    const capitalizedName = folderName.charAt(0).toUpperCase() + folderName.slice(1);
    const pattern1 = `${entry.path}/${capitalizedName}Concept.ts`;

    // Pattern 2: Convert snake_case to PascalCase (e.g., image_storage -> ImageStorage.ts)
    const pascalCaseName = folderName.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
    const pattern2 = `${entry.path}/${pascalCaseName}.ts`;
    const pattern3 = `${entry.path}/${pascalCaseName}Concept.ts`;

    // Pattern 4: Use folder name as-is (e.g., UserAuthentication -> UserAuthenticationConcept.ts)
    const pattern4 = `${entry.path}/${folderName}Concept.ts`;

    // Try each pattern
    for (const pattern of [pattern4, pattern1, pattern3, pattern2]) {
      try {
        Deno.realPathSync(pattern);
        conceptFilePath = pattern;
        // Use PascalCase version for API name
        conceptApiName = pascalCaseName;
        break;
      } catch {
        // File doesn't exist, try next pattern
      }
    }

    if (!conceptFilePath) {
      console.warn(`! No concept file found in ${entry.path}. Skipping.`);
      continue;
    }

    try {
      const modulePath = toFileUrl(Deno.realPathSync(conceptFilePath)).href;
      const module = await import(modulePath);
      const ConceptClass = module.default;

      if (
        typeof ConceptClass !== "function" ||
        !ConceptClass.name.endsWith("Concept")
      ) {
        console.warn(
          `! No valid concept class found in ${conceptFilePath}. Skipping.`,
        );
        continue;
      }

      const instance = new ConceptClass(db);

      // Use the actual class name for the API (e.g., "MemoryEntriesConcept" -> "MemoryEntries")
      const className = ConceptClass.name;
      conceptApiName = className.endsWith("Concept")
        ? className.slice(0, -7) // Remove "Concept" suffix
        : className;

      console.log(
        `- Registering concept: ${conceptApiName} at ${BASE_URL}/${conceptApiName}`,
      );

      const methodNames = Object.getOwnPropertyNames(
        Object.getPrototypeOf(instance),
      )
        .filter((name) =>
          name !== "constructor" && typeof instance[name] === "function"
        );

      for (const methodName of methodNames) {
        const actionName = methodName;
        const route = `${BASE_URL}/${conceptApiName}/${actionName}`;

        app.post(route, async (c) => {
          try {
            const body = await c.req.json().catch(() => ({})); // Handle empty body
            const result = await instance[methodName](body);
            return c.json(result);
          } catch (e) {
            console.error(`Error in ${conceptApiName}.${methodName}:`, e);
            return c.json({ error: "An internal server error occurred." }, 500);
          }
        });
        console.log(`  - Endpoint: POST ${route}`);
      }
    } catch (e) {
      console.error(
        `! Error loading concept from ${conceptFilePath}:`,
        e,
      );
    }
  }

  console.log(`\nServer listening on http://localhost:${PORT}`);
  Deno.serve({ port: PORT }, app.fetch);
}

// Run the server
main();
