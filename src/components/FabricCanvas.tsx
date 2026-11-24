"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fabric } from "fabric";
import {
  Circle, Focus, Hand, Image as ImageIcon, Minus, MousePointer2, Pencil, Plus,
  Redo2, Square, Trash2, Triangle, Type, Undo2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { prepareClipboardImage } from "@/lib/editor-image";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FabricCanvasProps {
  initialData?: string | null;
  initialHeight?: number | null;
  onSave: (data: string, height: number, image: string) => void;
}

const shapes = [
  ["text", "文字", Type], ["rect", "矩形", Square], ["circle", "圓形", Circle],
  ["triangle", "三角形", Triangle], ["line", "直線", Minus],
] as const;
const tools = [["select", "選取", MousePointer2], ["pan", "平移", Hand], ["pen", "畫筆", Pencil]] as const;
type Tool = (typeof tools)[number][0] | (typeof shapes)[number][0];
const identity = () => [1, 0, 0, 1, 0, 0];
const iconButton = "h-8 w-8 shrink-0 rounded-md";
const palette = ["#336699", "#3b82f6", "#ef4444", "#22c55e", "#f97316", "#a855f7", "#000000", "#f8fafc"];

function bounds(canvas: fabric.Canvas, padding: number) {
  const objects = canvas.getObjects().map((object) => object.getBoundingRect(true, true));
  if (!objects.length) return null;
  const left = Math.min(...objects.map((object) => object.left)) - padding;
  const top = Math.min(...objects.map((object) => object.top)) - padding;
  const right = Math.max(...objects.map((object) => object.left + object.width)) + padding;
  const bottom = Math.max(...objects.map((object) => object.top + object.height)) + padding;
  return { left, top, width: right - left, height: bottom - top };
}

function fitDrawing(canvas: fabric.Canvas, onlyWhenClipped = false) {
  const area = bounds(canvas, 28);
  if (onlyWhenClipped) {
    const visible = area && area.left >= 0 && area.top >= 0 &&
      area.left + area.width <= canvas.getWidth() && area.top + area.height <= canvas.getHeight();
    if (!area || visible) return canvas.getZoom();
  }
  const scale = area ? Math.max(0.2, Math.min(1.5, canvas.getWidth() / area.width, canvas.getHeight() / area.height)) : 1;
  canvas.setViewportTransform(area
    ? [scale, 0, 0, scale, (canvas.getWidth() - area.width * scale) / 2 - area.left * scale,
      (canvas.getHeight() - area.height * scale) / 2 - area.top * scale]
    : identity());
  canvas.requestRenderAll();
  return scale;
}

function preview(canvas: fabric.Canvas) {
  const area = bounds(canvas, 18);
  if (!area) return "";
  const viewport = canvas.viewportTransform ?? identity();
  const multiplier = Math.min(1.5, 1000 / Math.max(area.width, area.height));
  canvas.setViewportTransform(identity());
  try {
    const thumbnail = canvas.toCanvasElement(multiplier, area);
    const png = thumbnail.toDataURL("image/png");
    if (png.length < 155_000) return png;
    const context = thumbnail.getContext("2d");
    if (context) {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#fff";
      context.fillRect(0, 0, thumbnail.width, thumbnail.height);
    }
    return thumbnail.toDataURL("image/jpeg", 0.72);
  } finally {
    canvas.setViewportTransform(viewport);
  }
}

function pointerScreen(event: Event) {
  const pointer = "touches" in event ? (event as TouchEvent).touches[0] : event as MouseEvent;
  return pointer ? { x: pointer.clientX, y: pointer.clientY } : null;
}

type CanvasText = fabric.IText & { hiddenTextareaContainer?: HTMLElement };

function createShape(tool: Tool, point: { x: number; y: number }, color: string, strokeWidth: number) {
  const position = { left: point.x, top: point.y, originX: "center", originY: "center", lockScalingFlip: true };
  const style = { ...position, stroke: color, fill: color + "20", strokeWidth };
  switch (tool) {
    case "rect": return new fabric.Rect({ ...style, width: 100, height: 72 });
    case "circle": return new fabric.Circle({ ...style, radius: 44 });
    case "triangle": return new fabric.Triangle({ ...style, width: 100, height: 92 });
    case "line": return new fabric.Line([point.x - 48, point.y, point.x + 48, point.y], { stroke: color, strokeWidth });
    case "text": return new fabric.IText("輸入文字", { ...position, fill: color, fontSize: 22 });
    default: return null;
  }
}

export function FabricCanvas({ initialData, initialHeight, onSave }: FabricCanvasProps) {
  const board = useRef<HTMLDivElement>(null);
  const canvasElement = useRef<HTMLCanvasElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const instance = useRef<fabric.Canvas | null>(null);
  const saved = useRef("");
  const incoming = useRef(initialData);
  const save = useRef(onSave);
  const loading = useRef(false);
  const history = useRef<{ past: string[]; future: string[] }>({ past: [], future: [] });
  const clipboard = useRef<fabric.Object | null>(null);
  const command = useRef<Tool>("pen");
  const { resolvedTheme } = useTheme();
  const { toast } = useToast();
  const [tool, setActiveTool] = useState<Tool>("pen");
  const [color, setColor] = useState("");
  const [brushSize, setBrushSize] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [hasSelection, setHasSelection] = useState(false);
  const [historyState, setHistoryState] = useState({ undo: false, redo: false });
  const ink = color || (resolvedTheme === "dark" ? "#f8fafc" : "#336699");
  const brush = useRef({ color: ink, width: brushSize });
  const height = Math.min(720, Math.max(380, initialHeight ?? 500));
  const drawingHeight = useRef(height);

  useEffect(() => { save.current = onSave; }, [onSave]);
  useEffect(() => { drawingHeight.current = height; }, [height]);

  const updateHistory = useCallback(() => {
    setHistoryState({ undo: history.current.past.length > 0, redo: history.current.future.length > 0 });
  }, []);

  const setTool = useCallback((next: Tool) => {
    command.current = next;
    setActiveTool(next);
    const canvas = instance.current;
    if (!canvas) return;
    canvas.isDrawingMode = next === "pen";
    canvas.selection = next === "select";
    canvas.skipTargetFind = next !== "select";
    canvas.defaultCursor = next === "pan" ? "grab" : next === "select" ? "default" : "crosshair";
    if (next !== "select") canvas.discardActiveObject();
    canvas.requestRenderAll();
  }, []);

  const publish = useCallback((canvas: fabric.Canvas, data: string) => {
    saved.current = data;
    save.current(data, drawingHeight.current, preview(canvas));
  }, []);

  const loadDrawing = useCallback((canvas: fabric.Canvas, data: string | null | undefined, done: () => void) => {
    loading.current = true;
    canvas.discardActiveObject();
    const finish = () => {
      if (instance.current !== canvas) return;
      loading.current = false;
      canvas.requestRenderAll();
      done();
    };
    try {
      canvas.loadFromJSON(data?.trim().startsWith("{") ? data : { objects: [] }, finish);
    } catch {
      canvas.clear();
      finish();
    }
  }, []);

  const changeHistory = (direction: "past" | "future") => {
    const canvas = instance.current;
    if (!canvas || loading.current) return;
    const data = history.current[direction].pop();
    if (!data) return;
    history.current[direction === "past" ? "future" : "past"].push(saved.current);
    setTool("select");
    loadDrawing(canvas, data, () => {
      publish(canvas, data);
      updateHistory();
    });
  };

  useEffect(() => {
    const element = canvasElement.current;
    const host = board.current;
    if (!element || !host) return;
    const canvas = new fabric.Canvas(element, { backgroundColor: "transparent", preserveObjectStacking: true });
    instance.current = canvas;
    const pen = new fabric.PencilBrush(canvas);
    pen.color = brush.current.color;
    pen.width = brush.current.width;
    canvas.freeDrawingBrush = pen;
    canvas.getSelectionElement().style.touchAction = "none";
    setTool("pen");

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = host;
      if (!width || !height || (canvas.getWidth() === width && canvas.getHeight() === height)) return;
      canvas.setDimensions({ width, height });
      canvas.calcOffset();
      canvas.requestRenderAll();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let drag: { x: number; y: number } | null = null;
    canvas.on("mouse:down", ({ e, target }) => {
      if (loading.current) return;
      if (target instanceof fabric.IText) (target as CanvasText).hiddenTextareaContainer = host;
      if (!(target instanceof fabric.IText && target.isEditing)) host.focus({ preventScroll: true });
      if (command.current === "pan") {
        drag = pointerScreen(e);
        canvas.setCursor("grabbing");
        return;
      }
      const shape = createShape(command.current, canvas.getPointer(e), brush.current.color, brush.current.width);
      if (!shape) return;
      setTool("select");
      canvas.add(shape);
      canvas.setActiveObject(shape);
      if (shape instanceof fabric.IText) {
        (shape as CanvasText).hiddenTextareaContainer = host;
        shape.enterEditing();
        shape.selectAll();
      }
      canvas.requestRenderAll();
    });
    canvas.on("mouse:move", ({ e }) => {
      if (!drag || !canvas.viewportTransform) return;
      const point = pointerScreen(e);
      if (!point) return;
      const scale = host.getBoundingClientRect().width / host.clientWidth || 1;
      canvas.viewportTransform[4] += (point.x - drag.x) / scale;
      canvas.viewportTransform[5] += (point.y - drag.y) / scale;
      drag = point;
      canvas.requestRenderAll();
    });
    canvas.on("mouse:up", () => {
      if (!drag) return;
      drag = null;
      canvas.setViewportTransform(canvas.viewportTransform ?? identity());
      canvas.setCursor("grab");
    });
    canvas.on("mouse:wheel", ({ e }) => {
      if (!(e instanceof WheelEvent) || (!e.ctrlKey && !e.metaKey)) return;
      const next = Math.max(0.2, Math.min(4, canvas.getZoom() * 0.998 ** e.deltaY));
      canvas.zoomToPoint(canvas.getPointer(e, true), next);
      setZoom(next);
      e.preventDefault();
    });

    let queued = false;
    const collectChange = () => {
      if (loading.current || queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        if (instance.current !== canvas || loading.current) return;
        const data = JSON.stringify(canvas.toJSON());
        if (data === saved.current) return;
        history.current = { past: [...history.current.past.slice(-29), saved.current], future: [] };
        publish(canvas, data);
        updateHistory();
      });
    };
    canvas.on("object:modified", collectChange);
    canvas.on("object:added", collectChange);
    canvas.on("object:removed", collectChange);
    canvas.on("path:created", collectChange);
    canvas.on("text:changed", collectChange);
    canvas.on("text:editing:exited", collectChange);
    for (const event of ["selection:created", "selection:updated", "selection:cleared"]) {
      canvas.on(event, () => setHasSelection(canvas.getActiveObjects().length > 0));
    }

    let printView: { width: number; height: number; viewport: number[] } | undefined;
    const beforePrint = () => {
      const area = bounds(canvas, 20);
      if (!area) return;
      printView = { width: canvas.getWidth(), height: canvas.getHeight(), viewport: canvas.viewportTransform ?? identity() };
      const scale = Math.min(1, 800 / area.width);
      canvas.setDimensions({ width: area.width * scale, height: area.height * scale });
      canvas.setViewportTransform([scale, 0, 0, scale, -area.left * scale, -area.top * scale]);
      canvas.renderAll();
    };
    const afterPrint = () => {
      if (!printView) return;
      canvas.setDimensions({ width: printView.width, height: printView.height });
      canvas.setViewportTransform(printView.viewport);
      canvas.renderAll();
      printView = undefined;
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);
    loadDrawing(canvas, incoming.current, () => {
      saved.current = incoming.current ?? JSON.stringify(canvas.toJSON());
      setZoom(fitDrawing(canvas, true));
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      instance.current = null;
      canvas.dispose();
    };
  }, [loadDrawing, publish, setTool, updateHistory]);

  useEffect(() => {
    const previous = incoming.current;
    incoming.current = initialData;
    const canvas = instance.current;
    if (!canvas || initialData === previous || initialData === saved.current) return;
    loadDrawing(canvas, initialData, () => {
      saved.current = initialData ?? JSON.stringify(canvas.toJSON());
      setZoom(fitDrawing(canvas, true));
      history.current = { past: [], future: [] };
      updateHistory();
    });
  }, [initialData, loadDrawing, updateHistory]);

  useEffect(() => {
    brush.current = { color: ink, width: brushSize };
    if (instance.current?.freeDrawingBrush) {
      instance.current.freeDrawingBrush.color = ink;
      instance.current.freeDrawingBrush.width = brushSize;
    }
  }, [ink, brushSize]);

  const deleteSelection = () => {
    const canvas = instance.current;
    if (!canvas || loading.current) return;
    const objects = canvas.getActiveObjects();
    canvas.discardActiveObject();
    canvas.remove(...objects).requestRenderAll();
  };

  const onCanvasKeys = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const canvas = instance.current;
    if (!canvas || loading.current || event.target !== board.current) return;
    const key = event.key.toLowerCase();
    if (key === "delete" || key === "backspace") {
      if (!canvas.getActiveObjects().length) return;
      event.preventDefault();
      deleteSelection();
      return;
    }
    if (!(event.ctrlKey || event.metaKey)) {
      if (key === "escape") setTool("select");
      return;
    }
    if (key === "z" || key === "y") {
      event.preventDefault();
      event.stopPropagation();
      changeHistory(key === "y" || event.shiftKey ? "future" : "past");
    } else if (key === "c" || key === "x") {
      const object = canvas.getActiveObject();
      if (!object) return;
      event.preventDefault();
      object.clone((copy: fabric.Object) => { clipboard.current = copy; });
      if (key === "x") deleteSelection();
    } else if (key === "v" && clipboard.current) {
      event.preventDefault();
      clipboard.current.clone((copy: fabric.Object) => {
        if (canvas !== instance.current) return;
        setTool("select");
        canvas.discardActiveObject();
        copy.set({ left: (copy.left ?? 0) + 18, top: (copy.top ?? 0) + 18, evented: true, selectable: true });
        if (copy instanceof fabric.ActiveSelection) {
          copy.canvas = canvas;
          copy.forEachObject((object) => { canvas.add(object); });
          copy.setCoords();
        } else canvas.add(copy);
        canvas.setActiveObject(copy).requestRenderAll();
      });
    }
  };

  const changeZoom = (factor: number) => {
    const canvas = instance.current;
    if (!canvas) return;
    const next = Math.max(0.2, Math.min(4, canvas.getZoom() * factor));
    canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 }, next);
    setZoom(next);
  };

  const fit = () => {
    if (instance.current) setZoom(fitDrawing(instance.current));
  };

  const addImage = async (file?: File) => {
    const canvas = instance.current;
    if (!file || !canvas) return;
    try {
      const { src } = await prepareClipboardImage(file, 145_000);
      fabric.Image.fromURL(src, (image) => {
        if (canvas !== instance.current || !image.width) return;
        const viewport = canvas.viewportTransform ?? identity();
        const zoom = canvas.getZoom();
        image.scaleToWidth(Math.min(320 / zoom, image.width));
        image.set({
          left: (canvas.getWidth() / 2 - viewport[4]) / zoom,
          top: (canvas.getHeight() / 2 - viewport[5]) / zoom,
          originX: "center", originY: "center", lockScalingFlip: true,
        });
        setTool("select");
        canvas.add(image);
        canvas.setActiveObject(image).requestRenderAll();
      });
    } catch {
      toast({ title: "無法加入圖片", description: "請改用其他圖片檔案。", variant: "destructive" });
    }
  };

  const chooseColor = (next: string) => {
    setColor(next);
    const canvas = instance.current;
    if (!canvas || tool !== "select" || !hasSelection) return;
    for (const object of canvas.getActiveObjects()) {
      if (object.type === "i-text" || object.type === "text") object.set("fill", next);
      else if (object.type === "line" || object.type === "path") object.set("stroke", next);
      else if (object.type !== "image") object.set({ stroke: next, fill: next + "20" });
    }
    canvas.requestRenderAll();
    canvas.fire("object:modified");
  };

  const updateBrushSize = (value: number) => {
    setBrushSize(value);
    const canvas = instance.current;
    if (!canvas || tool !== "select" || !hasSelection) return;
    for (const object of canvas.getActiveObjects()) {
      if (object.type === "i-text" || object.type === "text") {
        (object as fabric.Text).set("fontWeight", value > 5 ? "bold" : "normal");
      } else if (object.type !== "image") {
        object.set("strokeWidth", value);
      }
    }
    canvas.requestRenderAll();
  };

  const activeShape = shapes.find(([mode]) => tool === mode);
  const modeButton = ([mode, label, Icon]: (typeof tools)[number] | (typeof shapes)[number]) => (
    <Button key={mode} variant={tool === mode ? "secondary" : "ghost"} size="icon" className={iconButton}
      title={label} aria-label={label} aria-pressed={tool === mode} onClick={() => setTool(mode)}>
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-card">
      <div role="toolbar" aria-label="手繪工具" className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b p-1.5">
        <div className="flex gap-0.5">{tools.map(modeButton)}</div>
        <div className="flex gap-0.5 border-l pl-2">{shapes.map(modeButton)}
          <Button variant="ghost" size="icon" className={iconButton} aria-label="加入圖片" title="加入圖片"
            onClick={() => fileInput.current?.click()}><ImageIcon className="h-4 w-4" /></Button>
          <input ref={fileInput} type="file" accept="image/*" hidden
            onChange={(event) => { void addImage(event.target.files?.[0]); event.target.value = ""; }} />
        </div>
        <div className="flex items-center gap-1 border-l pl-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className={iconButton} aria-label="手繪顏色" title="手繪顏色">
                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: ink }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="grid w-36 grid-cols-4 gap-2 rounded-lg border p-2">
              {palette.map((value) => (
                <button type="button" key={value} title={value} aria-label={value} aria-pressed={ink === value}
                  className="h-6 w-6 rounded-md border" style={{ backgroundColor: value }} onClick={() => chooseColor(value)} />
              ))}
            </PopoverContent>
          </Popover>
          {(tool === "pen" || (activeShape && tool !== "text") || (tool === "select" && hasSelection)) && (
            <Slider aria-label="筆畫粗細" value={[brushSize]} min={1} max={30} step={1}
              className="w-16 sm:w-20" onValueChange={([value]) => updateBrushSize(value)}
              onValueCommit={() => {
                if (tool === "select" && hasSelection) instance.current?.fire("object:modified");
              }} />
          )}
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className={iconButton} aria-label="復原畫布" title="復原畫布"
            disabled={!historyState.undo} onClick={() => changeHistory("past")}><Undo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className={iconButton} aria-label="重做畫布" title="重做畫布"
            disabled={!historyState.redo} onClick={() => changeHistory("future")}><Redo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className={cn(iconButton, "text-destructive")} aria-label="刪除選取物件"
            title="刪除選取物件" disabled={!hasSelection} onClick={deleteSelection}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="relative">
        <div ref={board} tabIndex={0} aria-label="手繪畫布" onKeyDown={onCanvasKeys}
          style={{ "--drawing-height": height + "px" } as React.CSSProperties}
          onBlur={(event) => {
            if (event.currentTarget.contains(event.relatedTarget)) return;
            const target = instance.current?.getActiveObject();
            if (target instanceof fabric.IText && target.isEditing) target.exitEditing();
          }}
          className="dot-grid relative h-[min(var(--drawing-height),max(380px,52dvh))] w-full overflow-hidden bg-muted/25 outline-none focus-visible:ring-2 md:h-[var(--drawing-height)] focus-visible:ring-inset focus-visible:ring-ring">
          <canvas ref={canvasElement} />
        </div>
        {activeShape && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-md border bg-card px-2 py-1 text-xs text-muted-foreground">
            點一下放置{activeShape[1]}
          </span>
        )}
        <div role="group" aria-label="畫布縮放" className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border bg-card p-0.5 shadow-sm">
          <Button variant="ghost" size="icon" className={iconButton} aria-label="縮小畫布" title="縮小畫布"
            disabled={zoom <= 0.2} onClick={() => changeZoom(1 / 1.2)}><Minus className="h-4 w-4" /></Button>
          <span className="min-w-9 text-center text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className={iconButton} aria-label="放大畫布" title="放大畫布"
            disabled={zoom >= 4} onClick={() => changeZoom(1.2)}><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className={iconButton} aria-label="顯示全部內容" title="顯示全部內容"
            onClick={fit}><Focus className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
