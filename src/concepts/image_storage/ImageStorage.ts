import { Collection, Db } from "npm:mongodb";
import { Empty as _Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { GcsSignOptions, generateV4SignedUrl } from "@utils/gcs.ts";

const PREFIX = "File" + ".";

// Types for this concept
export type User = ID;
export type ImageId = ID;

interface ImageDocument {
  _id: ImageId;
  owner: User;
  bucket: string;
  object: string; // GCS object path
  contentType?: string;
  size?: number;
  createdAt: Date;
}

export default class ImageStorageConcept {
  private images: Collection<ImageDocument>;
  private signUrl: (opts: GcsSignOptions) => Promise<string>;

  constructor(
    private readonly db: Db,
    options?: { signUrl?: (opts: GcsSignOptions) => Promise<string> },
  ) {
    this.images = this.db.collection(PREFIX + "images");
    this.signUrl = options?.signUrl ?? generateV4SignedUrl;
  }

  private requireBucket(): string | { error: string } {
    const bucket = Deno.env.get("GCS_BUCKET");
    if (!bucket) return { error: "GCS_BUCKET env var is required" };
    return bucket;
  }

  private safeName(name: string): string {
    // Basic sanitization: remove path traversal, spaces, and special characters
    return name
      .replace(/\\/g, "") // Remove backslashes
      .replace(/\//g, "-") // Replace forward slashes with dashes
      .replace(/[&\s]+/g, "-") // Replace spaces and ampersands with dashes
      .replace(/-+/g, "-"); // Collapse multiple dashes into one
  }

  // action: requestUploadUrl (user: User, filename: string, contentType?: string): { uploadUrl: string, bucket: string, object: string }
  async requestUploadUrl(
    input: {
      user: User;
      imageName: string;
      contentType?: string;
      expiresInSeconds?: number;
    },
  ): Promise<
    { uploadUrl: string; bucket: string; object: string } | { error: string }
  > {
    const { user, imageName, contentType: _contentType, expiresInSeconds } =
      input;
    if (!user) return { error: "User ID must be provided." };
    if (!imageName) return { error: "filename is required" };
    const bucketResult = this.requireBucket();
    if (typeof bucketResult === "object" && "error" in bucketResult) {
      return bucketResult;
    }
    const bucket = bucketResult;
    const base = `${user}/${Date.now()}-${this.safeName(imageName)}`;
    const object = base;
    try {
      const uploadUrl = await this.signUrl({
        method: "PUT",
        bucket,
        object,
        expiresInSeconds: expiresInSeconds ?? 900,
      });
      return { uploadUrl, bucket, object };
    } catch (e) {
      console.error("Failed to generate upload URL:", e);
      return { error: "Failed to generate upload URL" };
    }
  }

  // action: confirmUpload (user: User, object: string, contentType?: string, size?: number): { file: FileId, url: string }
  async confirmUpload(
    input: { user: User; object: string; contentType?: string; size?: number },
  ): Promise<{ image: ImageId; url: string } | { error: string }> {
    const { user, object, contentType, size } = input;
    if (!user) return { error: "User ID must be provided." };
    if (!object) return { error: "object is required" };
    const bucketResult = this.requireBucket();
    if (typeof bucketResult === "object" && "error" in bucketResult) {
      return bucketResult;
    }
    const bucket = bucketResult;

    const imageId = freshID();
    const doc: ImageDocument = {
      _id: imageId,
      owner: user,
      bucket,
      object,
      contentType,
      size,
      createdAt: new Date(),
    };
    try {
      await this.images.insertOne(doc);
      const url = `https://storage.googleapis.com/${bucket}/${object}`;
      return { image: imageId, url };
    } catch (e) {
      console.error("Failed to record image metadata:", e);
      return { error: "Failed to confirm upload" };
    }
  }

  // action: getViewUrl (user: User, object: string, expiresInSeconds?: number): { url: string }
  // Note: In a real app, verify access (owner or friend) before issuing the URL.
  async getViewUrl(
    input: { user: User; object: string; expiresInSeconds?: number },
  ): Promise<{ url: string } | { error: string }> {
    const { user, object, expiresInSeconds } = input;
    if (!user) return { error: "User ID must be provided." };
    if (!object) return { error: "object is required" };
    const bucketResult = this.requireBucket();
    if (typeof bucketResult === "object" && "error" in bucketResult) {
      return bucketResult;
    }
    const bucket = bucketResult;
    try {
      const url = await this.signUrl({
        method: "GET",
        bucket,
        object,
        expiresInSeconds: expiresInSeconds ?? 300,
      });
      return { url };
    } catch (e) {
      console.error("Failed to generate view URL:", e);
      return { error: "Failed to generate view URL" };
    }
  }

  // Queries
  async _getImageById(
    input: { image: ImageId },
  ): Promise<{ image?: ImageDocument }> {
    const { image } = input;
    const found = await this.images.findOne({ _id: image });
    return { image: found ?? undefined };
  }

  async _getImagesByOwner(
    input: { user: User },
  ): Promise<{ images: ImageDocument[] }> {
    const { user } = input;
    const images = await this.images.find({ owner: user }).sort({
      createdAt: -1,
    })
      .toArray();
    return { images };
  }
}
