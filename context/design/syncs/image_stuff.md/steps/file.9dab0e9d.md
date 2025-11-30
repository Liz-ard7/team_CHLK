---
timestamp: 'Sat Nov 29 2025 18:15:06 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_181506.43501985.md]]'
content_id: 9dab0e9d1ed2956ef7084b0e84ad643e185d183bf4e888adfbc0a1fb21676795
---

# file: src/concepts/imagestorage/ImageStorageConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Storage } from "npm:@google-cloud/storage";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "ImageStorage.";

// Generic types of this concept
type User = ID;
type FileId = ID;

/**
 * @concept ImageStorage
 * @purpose manage user-owned images, supporting secure upload, storage, and retrieval of content
 * @principle users can request a secure URL to upload an image, confirm the upload to store its metadata, and then request another secure URL to view the uploaded image, which remains accessible by its owner
 */

/**
 * Represents a stored image's metadata in the database.
 * Corresponds to the 'Images' set in the concept state.
 */
interface ImageDoc {
  _id: FileId;
  owner: User;
  bucket: string;
  object: string;
  contentType?: string;
  size?: number;
  createdAt: Date;
}

export default class ImageStorageConcept {
  public readonly images: Collection<ImageDoc>;
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(private readonly db: Db) {
    this.images = this.db.collection(PREFIX + "images");

    // GCS setup requires the GCS_BUCKET environment variable to be set.
    // Authentication is handled automatically via the GOOGLE_APPLICATION_CREDENTIALS env var.
    this.bucketName = Deno.env.get("GCS_BUCKET") ?? "";
    if (!this.bucketName) {
      throw new Error("GCS_BUCKET environment variable is not set. ImageStorageConcept cannot operate.");
    }
    this.storage = new Storage();
  }

  /**
   * requestUploadUrl (user: User, filename: String, contentType?: String, expiresInSeconds?: Number): (uploadUrl: String, bucket: String, object: String)
   *
   * @requires user ID must be provided; filename must be provided; the `GCS_BUCKET` environment variable must be set on the server
   * @effects generates a new, time-limited, signed PUT URL valid for uploading a file to the configured cloud storage bucket; returns the `uploadUrl`, the target `bucket` name, and the generated `object` path for the file
   */
  async requestUploadUrl({ user, filename, contentType, expiresInSeconds = 300 }: { user: User; filename: string; contentType?: string; expiresInSeconds?: number }): Promise<{ uploadUrl: string; bucket: string; object: string } | { error: string }> {
    if (!user || !filename) {
      return { error: "User and filename are required." };
    }

    try {
      const objectPath = `${user}/${freshID()}/${filename}`;
      const expires = Date.now() + expiresInSeconds * 1000;

      const options = {
        version: "v4" as const,
        action: "write" as const,
        expires,
        contentType,
      };

      const [url] = await this.storage.bucket(this.bucketName).file(objectPath).getSignedUrl(options);

      return {
        uploadUrl: url,
        bucket: this.bucketName,
        object: objectPath,
      };
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to generate upload URL: ${e.message}` };
      }
      return { error: "An unknown error occurred while generating the upload URL." };
    }
  }

  /**
   * confirmUpload (user: User, object: String, contentType?: String, size?: Number): (file: FileId, url: String)
   *
   * @requires user ID must be provided; object path (from `requestUploadUrl`) must be provided; the `GCS_BUCKET` environment variable must be set on the server
   * @effects creates a new FileId and stores a new file document in the database, associating it with the `user`, `bucket`, `object` path, `contentType`, `size`, and `createdAt` timestamp; returns the newly created `file` ID and a direct public `url` to the stored file
   */
  async confirmUpload({ user, object, contentType, size }: { user: User; object: string; contentType?: string; size?: number }): Promise<{ file: FileId; url: string } | { error: string }> {
    if (!user || !object) {
      return { error: "User and object path are required." };
    }

    try {
      const fileId = freshID() as FileId;
      const newImage: ImageDoc = {
        _id: fileId,
        owner: user,
        bucket: this.bucketName,
        object: object,
        contentType,
        size,
        createdAt: new Date(),
      };

      const result = await this.images.insertOne(newImage);
      if (!result.acknowledged) {
        return { error: "Failed to save file metadata to the database." };
      }

      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${object}`;

      return {
        file: fileId,
        url: publicUrl,
      };
    } catch (e) {
      if (e instanceof Error) {
        return { error: `Failed to confirm upload: ${e.message}` };
      }
      return { error: "An unknown error occurred while confirming the upload." };
    }
  }

  /**
   * getViewUrl (user: User, object: String, expiresInSeconds?: Number): (url: String)
   *
   * @requires user ID must be provided; object path must be provided; the `GCS_BUCKET` environment variable must be set on the server
   * @effects generates a new, time-limited, signed GET URL for the specified `object` in the configured cloud storage bucket; returns the generated `url` for viewing the file; *Note: This action does not perform access control; it assumes the caller is authorized to view the file.*
   */
  async getViewUrl({ user, object, expiresInSeconds = 300 }: { user: User; object: string; expiresInSeconds?: number }): Promise<{ url: string } | { error: string }> {
    if (!user || !object) {
      return { error: "User and object path are required." };
    }

    try {
      const expires = Date.now() + expiresInSeconds * 1000;

      const options = {
        version: "v4" as const,
        action: "read" as const,
        expires,
      };

      const [url] = await this.storage.bucket(this.bucketName).file(object).getSignedUrl(options);

      return { url };
    } catch (e) {
      if (e instanceof Error) {
        if (e.message.includes("No such object")) {
          return { error: "File not found at the specified object path." };
        }
        return { error: `Failed to generate view URL: ${e.message}` };
      }
      return { error: "An unknown error occurred while generating the view URL." };
    }
  }
}
```
