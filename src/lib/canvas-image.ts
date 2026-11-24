export async function renderCanvasJsonToPng(
  canvasJson: string,
  height: number,
  fitToObjects = false,
): Promise<string> {
  const { fabric } = await import("fabric");
  const canvas = new fabric.StaticCanvas(document.createElement("canvas"), {
    width: 800,
    height: height || 500,
    backgroundColor: "#fff",
    enableRetinaScaling: false,
  });

  try {
    return await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Canvas render timed out")), 10000);
      try {
        canvas.loadFromJSON(canvasJson, () => {
          window.clearTimeout(timeout);
          try {
            const objects = canvas.getObjects();
            if (fitToObjects && objects.length) {
              const bounds = objects.map((object) => object.getBoundingRect(true, true));
              const left = Math.min(...bounds.map((area) => area.left)) - 18;
              const top = Math.min(...bounds.map((area) => area.top)) - 18;
              const width = Math.ceil(Math.max(...bounds.map((area) => area.left + area.width)) - left + 18);
              const height = Math.ceil(Math.max(...bounds.map((area) => area.top + area.height)) - top + 18);
              const scale = Math.min(2, 1600 / Math.max(width, height));
              resolve(canvas.toCanvasElement(scale, { left, top, width, height }).toDataURL("image/png"));
            } else {
              resolve(canvas.toDataURL({ format: "png", multiplier: 2 }));
            }
          } catch (error) {
            reject(error);
          }
        });
      } catch (error) {
        window.clearTimeout(timeout);
        reject(error);
      }
    });
  } finally {
    canvas.dispose();
  }
}
