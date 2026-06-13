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
