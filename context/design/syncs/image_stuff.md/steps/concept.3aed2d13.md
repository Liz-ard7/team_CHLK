---
timestamp: 'Sat Nov 29 2025 18:15:06 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251129_181506.43501985.md]]'
content_id: 3aed2d135bc0b5731b9f2b65b4affd6d800cfe27aa1328bb0415ff4eccb65a13
---

# concept: ImageStorage

### purpose

manage user-owned images, supporting secure upload, storage, and retrieval of content

### principle

users can request a secure URL to upload an image, confirm the upload to store its metadata, and then request another secure URL to view the uploaded image, which remains accessible by its owner

### state

* a set of Images with
  * an owner User
  * a bucket String
  * an object String
  * a contentType String
  * a size Number
  * a createdAt Date

### actions

#### requestUploadUrl (user: User, filename: String, contentType?: String, expiresInSeconds?: Number): (uploadUrl: String, bucket: String, object: String)

* Requires: user ID must be provided; filename must be provided; the `GCS_BUCKET` environment variable must be set on the server
* Effects: generates a new, time-limited, signed PUT URL valid for uploading a file to the configured cloud storage bucket; returns the `uploadUrl`, the target `bucket` name, and the generated `object` path for the file

#### confirmUpload (user: User, object: String, contentType?: String, size?: Number): (file: FileId, url: String)

* Requires: user ID must be provided; object path (from `requestUploadUrl`) must be provided; the `GCS_BUCKET` environment variable must be set on the server
* Effects: creates a new FileId and stores a new file document in the database, associating it with the `user`, `bucket`, `object` path, `contentType`, `size`, and `createdAt` timestamp; returns the newly created `file` ID and a direct public `url` to the stored file

#### getViewUrl (user: User, object: String, expiresInSeconds?: Number): (url: String)

* Requires: user ID must be provided; object path must be provided; the `GCS_BUCKET` environment variable must be set on the server
* Effects: generates a new, time-limited, signed GET URL for the specified `object` in the configured cloud storage bucket; returns the generated `url` for viewing the file; *Note: This action does not perform access control; it assumes the caller is authorized to view the file.*
