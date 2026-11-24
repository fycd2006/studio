const maxImageSide = 1280;
export const maxEmbeddedImageBytes = 175_000;

export function utf8Length(text: string) {
  return new TextEncoder().encode(text).length;
}

export async function prepareClipboardImage(file: Blob, maxBytes: number) {
  if (maxBytes < 1_500) throw new Error("No room for another image");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    let scale = Math.min(1, maxImageSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion unavailable");
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      if (attempt === 0) {
        const png = canvas.toDataURL("image/png");
        if (png.length <= maxBytes) return { src: png, width: canvas.width, height: canvas.height };
      }
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "white";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.globalCompositeOperation = "source-over";
      const jpeg = canvas.toDataURL("image/jpeg", attempt % 2 ? 0.55 : 0.78);
      if (jpeg.length <= maxBytes) return { src: jpeg, width: canvas.width, height: canvas.height };
      if (attempt % 2) scale *= 0.7;
    }
    throw new Error("Image could not be compressed to fit");
  } finally {
    URL.revokeObjectURL(url);
  }
}
