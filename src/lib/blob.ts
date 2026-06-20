import { put, get, del } from "@vercel/blob";

const token = process.env.BLOB_READ_WRITE_TOKEN;

/** Store a candidate photo privately; returns the blob pathname to persist in photoUrl. */
export async function storeCandidatePhoto(
  body: ArrayBuffer,
  ext: string,
  contentType: string,
): Promise<string> {
  const { pathname } = await put(`candidates/${crypto.randomUUID()}.${ext}`, body, {
    access: "private",
    contentType,
    token,
  });
  return pathname;
}

/** Fetch a private candidate photo as a stream + content type for serving. */
export async function readCandidatePhoto(
  pathname: string,
): Promise<{ stream: ReadableStream<Uint8Array>; contentType: string } | null> {
  const res = await get(pathname, { access: "private", token });
  if (!res || res.statusCode !== 200) return null;
  return { stream: res.stream, contentType: res.blob.contentType };
}

/** Best-effort delete; never throws (an orphaned blob is acceptable). */
export async function deleteCandidatePhoto(pathname: string): Promise<void> {
  try {
    await del(pathname, { token });
  } catch {
    /* don't block the mutation on cleanup failure */
  }
}

/** Store a community logo privately; returns the blob pathname to persist in logoUrl. */
export async function storeCommunityLogo(
  body: ArrayBuffer,
  ext: string,
  contentType: string,
): Promise<string> {
  const { pathname } = await put(`communities/${crypto.randomUUID()}.${ext}`, body, {
    access: "private",
    contentType,
    token,
  });
  return pathname;
}

// Reading/deleting a logo is identical to a photo (a private blob keyed by pathname).
export const readCommunityLogo = readCandidatePhoto;
export const deleteCommunityLogo = deleteCandidatePhoto;
