// Utility to generate Google Cloud Storage V4 signed URLs (PUT/GET) using
// service account credentials. Works in Deno without extra deps.

type SignMethod = "GET" | "PUT" | "HEAD" | "DELETE";

export interface GcsSignOptions {
  method: SignMethod;
  bucket: string;
  object: string;
  expiresInSeconds?: number; // max 604800 (7 days)
}

interface ServiceAccount {
  client_email: string;
  private_key: string; // PKCS8 PEM
}

const ALG = "GOOG4-RSA-SHA256";
const SERVICE = "storage";
const REGION = "auto"; // recommended by Google for GCS

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  return crypto.subtle.digest("SHA-256", enc.encode(input)).then(toHex);
}

function rfc3986EncodeURIComponent(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodePathPreserveSlashes(path: string): string {
  return path.split("/").map(rfc3986EncodeURIComponent).join("/");
}

function yyyymmdd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function amzDate(date: Date): string {
  const ymd = yyyymmdd(date);
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${ymd}T${hh}${mm}${ss}Z`;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function pemToDer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "").replace(
    /-----END [^-]+-----/,
    "",
  ).replace(/\s+/g, "");
  return base64ToArrayBuffer(b64);
}

function importPrivateKey(pkcs8Pem: string): Promise<CryptoKey> {
  const keyData = pemToDer(pkcs8Pem);
  return crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function signHex(key: CryptoKey, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    enc.encode(payload),
  );
  return toHex(sig);
}

async function getServiceAccount(): Promise<ServiceAccount> {
  const client_email = Deno.env.get("GCS_CLIENT_EMAIL");
  const private_key = Deno.env.get("GCS_PRIVATE_KEY");
  if (client_email && private_key) return { client_email, private_key };

  const path = Deno.env.get("GOOGLE_APPLICATION_CREDENTIALS") ??
    Deno.env.get("GCS_CREDENTIALS_JSON");
  if (!path) {
    throw new Error(
      "GCS credentials not found. Set GCS_CLIENT_EMAIL and GCS_PRIVATE_KEY or GOOGLE_APPLICATION_CREDENTIALS to a service account JSON file.",
    );
  }
  const text = await Deno.readTextFile(path);
  const json = JSON.parse(text);
  if (!json.client_email || !json.private_key) {
    throw new Error(
      "Invalid service account JSON: missing client_email/private_key",
    );
  }
  return {
    client_email: json.client_email,
    private_key: json.private_key,
  } as ServiceAccount;
}

export async function generateV4SignedUrl(
  opts: GcsSignOptions,
): Promise<string> {
  const { method, bucket, object } = opts;
  const expiresInSeconds = Math.min(
    Math.max(opts.expiresInSeconds ?? 900, 1),
    604800,
  );

  const sa = await getServiceAccount();
  const now = new Date();
  const ymd = yyyymmdd(now);
  const timestamp = amzDate(now);
  const credentialScope = `${ymd}/${REGION}/${SERVICE}/goog4_request`;
  const credential = `${sa.client_email}/${credentialScope}`;

  const host = "storage.googleapis.com";
  const canonicalUri = `/${bucket}/${encodePathPreserveSlashes(object)}`;

  // Query parameters (sorted)
  const params: Record<string, string> = {
    "X-Goog-Algorithm": ALG,
    // IMPORTANT: Do not pre-encode values here; they will be RFC3986-encoded
    // exactly once when building the canonical query string.
    "X-Goog-Credential": credential,
    "X-Goog-Date": timestamp,
    "X-Goog-Expires": String(expiresInSeconds),
    "X-Goog-SignedHeaders": "host",
  };

  const canonicalQuery = Object.keys(params).sort().map((k) =>
    `${rfc3986EncodeURIComponent(k)}=${rfc3986EncodeURIComponent(params[k])}`
  ).join("&");
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const hashedPayload = "UNSIGNED-PAYLOAD";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    hashedPayload,
  ].join("\n");

  const canonicalRequestHash = await sha256Hex(canonicalRequest);
  const stringToSign = [
    ALG,
    timestamp,
    credentialScope,
    canonicalRequestHash,
  ].join("\n");

  const privateKey = await importPrivateKey(sa.private_key);
  const signatureHex = await signHex(privateKey, stringToSign);

  const url =
    `https://${host}${canonicalUri}?${canonicalQuery}&X-Goog-Signature=${signatureHex}`;
  return url;
}
