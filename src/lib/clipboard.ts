/**
 * Best-effort copy of an image URL to the clipboard as PNG. The clipboard only
 * accepts image/png, so the (JPEG) photo is redrawn through a canvas first.
 * `navigator.clipboard.write` is called with a *promise-valued* ClipboardItem so
 * the write begins synchronously inside the user gesture while the blob resolves.
 * Returns false (rather than throwing) on any failure / unsupported browser.
 */
export async function copyImageToClipboard(url: string): Promise<boolean> {
  try {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) return false;
    const png = fetch(url, { credentials: "include" })
      .then((r) => r.blob())
      .then(jpegToPng);
    await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
    return true;
  } catch {
    return false;
  }
}

function jpegToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);
      if (!ctx) return reject(new Error("no 2d context"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });
}
