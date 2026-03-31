
"use client"

import { useEffect, useRef, useState, useCallback } from "react";
import { fabric } from "fabric";
import { 
 Pencil, 
 Type, 
 Square, 
 Circle as CircleIcon, 
 Triangle, 
 Image as ImageIcon,
 Trash2,
 MousePointer2,
 Minus,
 Hand
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";

interface FabricCanvasProps {
 initialData?: string | null;
 initialHeight?: number | null;
 onSave: (data: string, height: number, image: string) => void;
}

export function FabricCanvas({ initialData, initialHeight = 500, onSave }: FabricCanvasProps) {
 const wrapperRef = useRef<HTMLDivElement>(null);
 const canvasRef = useRef<HTMLCanvasElement>(null);
 const fabricRef = useRef<fabric.Canvas | null>(null);
 const onSaveRef = useRef(onSave);
 const clipboard = useRef<any>(null);
 const isInitialLoad = useRef(true);
 const isInternalUpdate = useRef(false);
 
 const { resolvedTheme } = useTheme();
 const [brushColor, setBrushColor] = useState("");
 const [userPickedColor, setUserPickedColor] = useState(false);
 const [brushSize, setBrushSize] = useState(3);
 const [activeTool, setActiveTool] = useState<'pen' | 'select' | 'pan' | 'shape'>('pen');
 const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
 const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
 const [canvasMounted, setCanvasMounted] = useState(0);

 useEffect(() => {
 if (!userPickedColor) {
 setBrushColor(resolvedTheme === 'dark' ? '#f8fafc' : '#336699');
 }
 }, [resolvedTheme, userPickedColor]);

 // Use effective color so UI renders immediately without waiting for effect
 const activeColor = brushColor || (resolvedTheme === 'dark' ? '#f8fafc' : '#336699');

 const activeToolRef = useRef(activeTool);
 const brushColorRef = useRef(activeColor);
 const brushSizeRef = useRef(brushSize);
 const pendingShapeRef = useRef<'rect' | 'circle' | 'triangle' | 'line' | 'text' | null>(null);
 const lastSavedData = useRef(initialData);

 useEffect(() => {
 activeToolRef.current = activeTool;
 brushColorRef.current = activeColor;
 brushSizeRef.current = brushSize;
 }, [activeTool, activeColor, brushSize]);

 // Sync initialData changes from external sources (like Undo/Redo)
 useEffect(() => {
 if (
 fabricRef.current && 
 initialData && 
 initialData !== lastSavedData.current && 
 typeof initialData === 'string' && 
 initialData.trim().startsWith('{')
 ) {
 isInternalUpdate.current = true;
 fabricRef.current.loadFromJSON(initialData, () => {
 fabricRef.current?.renderAll();
 lastSavedData.current = initialData;
 isInternalUpdate.current = false;
 });
 }
 }, [initialData]);

 useEffect(() => {
 onSaveRef.current = onSave;
 }, [onSave]);

 const copy = useCallback(() => {
 if (!fabricRef.current) return;
 fabricRef.current.getActiveObject()?.clone((cloned: any) => {
 clipboard.current = cloned;
 });
 }, []);

 const cut = useCallback(() => {
 if (!fabricRef.current) return;
 const activeObject = fabricRef.current.getActiveObject();
 if (!activeObject) return;
 activeObject.clone((cloned: any) => {
 clipboard.current = cloned;
 fabricRef.current?.remove(activeObject);
 fabricRef.current?.discardActiveObject().renderAll();
 });
 }, []);

 const paste = useCallback(() => {
 if (!fabricRef.current || !clipboard.current) return;
 clipboard.current.clone((clonedObj: any) => {
 fabricRef.current?.discardActiveObject();
 clonedObj.set({
 left: (clonedObj.left || 0) + 20,
 top: (clonedObj.top || 0) + 20,
 evented: true,
 });
 if (clonedObj.type === 'activeSelection') {
 clonedObj.canvas = fabricRef.current;
 clonedObj.forEachObject((obj: any) => {
 fabricRef.current?.add(obj);
 });
 clonedObj.setCoords();
 } else {
 fabricRef.current?.add(clonedObj);
 }
 clipboard.current.top += 20;
 clipboard.current.left += 20;
 fabricRef.current?.setActiveObject(clonedObj);
 fabricRef.current?.requestRenderAll();
 });
 }, []);

 useEffect(() => {
 const wrapper = wrapperRef.current;
 if (!wrapper) return;

 const updateSize = () => {
 const nextWidth = Math.max(0, Math.floor(wrapper.clientWidth));
 const nextHeight = Math.max(0, Math.floor(wrapper.clientHeight));
 if (nextWidth === 0 || nextHeight === 0) return;
 setContainerSize((prev) =>
 prev.width === nextWidth && prev.height === nextHeight
 ? prev
 : { width: nextWidth, height: nextHeight }
 );
 };

 updateSize();
 const observer = new ResizeObserver(updateSize);
 observer.observe(wrapper);

 return () => observer.disconnect();
 }, []);

 useEffect(() => {
 if (!canvasRef.current) return;

 const canvas = new fabric.Canvas(canvasRef.current, {
 backgroundColor: "transparent",
 });

 // Prevent browser scroll/back gestures while drawing on touch devices.
 canvas.lowerCanvasEl.style.touchAction = "none";
 if (canvas.upperCanvasEl) {
 canvas.upperCanvasEl.style.touchAction = "none";
 }

 (canvas as any).uniScaleTransform = true;

 fabricRef.current = canvas;
 setCanvasMounted((v) => v + 1);

 // Apply initial viewport dimensions immediately so the first render is drawable
 // even before the first ResizeObserver callback.
 const wrapper = wrapperRef.current;
 if (wrapper) {
 const initialWidth = Math.max(0, Math.floor(wrapper.clientWidth));
 const initialHeight = Math.max(0, Math.floor(wrapper.clientHeight));
 if (initialWidth > 0 && initialHeight > 0) {
 canvas.setDimensions({ width: initialWidth, height: initialHeight });
 }
 }

 const syncCanvasSize = () => {
 const el = wrapperRef.current;
 if (!el) return;
 const width = Math.max(0, Math.floor(el.clientWidth));
 const height = Math.max(0, Math.floor(el.clientHeight));
 if (width > 0 && height > 0) {
 canvas.setDimensions({ width, height });
 canvas.calcOffset();
 canvas.requestRenderAll();
 }
 };

 // Guard against delayed layout passes where initial clientHeight is still small.
 const rafId = requestAnimationFrame(syncCanvasSize);
 const timeoutId = window.setTimeout(syncCanvasSize, 120);

 // Default to drawing mode for faster canvas interaction.
 const initialBrush = new fabric.PencilBrush(canvas);
 initialBrush.color = brushColorRef.current;
 initialBrush.width = brushSizeRef.current;
 canvas.isDrawingMode = true;
 canvas.selection = false;
 canvas.defaultCursor = 'default';
 canvas.freeDrawingBrush = initialBrush;
 setTool('pen');

 if (isInitialLoad.current && initialData && typeof initialData === 'string' && initialData.trim().startsWith('{')) {
 try {
 isInternalUpdate.current = true;
 canvas.loadFromJSON(initialData, () => {
 canvas.renderAll();
 isInitialLoad.current = false;
 isInternalUpdate.current = false;
 });
 } catch (e) {
 isInitialLoad.current = false;
 isInternalUpdate.current = false;
 }
 } else if (isInitialLoad.current) {
 isInitialLoad.current = false;
 }

 // Zoom & Pan Event Listeners
 let isDragging = false;
 let lastPosX = 0;
 let lastPosY = 0;

 canvas.on('mouse:down', function (opt) {
 const evt = opt.e as any;

 if (activeToolRef.current === 'shape' && pendingShapeRef.current) {
 const type = pendingShapeRef.current;
 const color = brushColorRef.current;
 const size = brushSizeRef.current;
 const pointer = canvas.getPointer(opt.e);
 
 const common = { 
 left: pointer.x, 
 top: pointer.y, 
 originX: 'center',
 originY: 'center',
 fill: color + "20", 
 stroke: color, 
 strokeWidth: 2,
 lockScalingFlip: true 
 };

 let object: fabric.Object | undefined;
 switch (type) {
 case 'rect': object = new fabric.Rect({ ...common, width: 100, height: 100 }); break;
 case 'circle': object = new fabric.Circle({ ...common, radius: 50 }); break;
 case 'triangle': object = new fabric.Triangle({ ...common, width: 100, height: 100 }); break;
 case 'line': object = new fabric.Line([pointer.x - 50, pointer.y, pointer.x + 50, pointer.y], { stroke: color, strokeWidth: size }); break;
 case 'text': object = new fabric.IText('雙擊編輯', { ...common, fill: color, strokeWidth: size > 5 ? 2 : 0, fontWeight: size > 5 ? 'bold' : 'normal', fontSize: 22 }); break;
 }

 if (object) {
 canvas.add(object);
 canvas.setActiveObject(object);
 canvas.renderAll();
 }

 pendingShapeRef.current = null;
 // Need to use state setter, but we can't reliably call it from inside the useEffect without ref. Just dispatch event.
 window.dispatchEvent(new CustomEvent('fabric:tool_reset'));
 return;
 }

 if (activeToolRef.current === 'pan' || evt.altKey || evt.button === 1) {
 isDragging = true;
 canvas.selection = false;
 lastPosX = evt.clientX || (evt.touches && evt.touches[0].clientX) || 0;
 lastPosY = evt.clientY || (evt.touches && evt.touches[0].clientY) || 0;
 }
 });

 canvas.on('mouse:move', function (opt) {
 if (isDragging) {
 const e = opt.e as any;
 const vpt = canvas.viewportTransform;
 const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
 const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
 if (vpt) {
 vpt[4] += clientX - lastPosX;
 vpt[5] += clientY - lastPosY;
 canvas.requestRenderAll();
 lastPosX = clientX;
 lastPosY = clientY;
 }
 }
 });

 canvas.on('mouse:up', function (opt) {
 if (isDragging) {
 if (canvas.viewportTransform) {
 canvas.setViewportTransform(canvas.viewportTransform);
 }
 isDragging = false;
 canvas.selection = activeToolRef.current === 'select';
 }
 });

 canvas.on('mouse:wheel', function (opt) {
 const delta = opt.e.deltaY;
 let zoom = canvas.getZoom();
 zoom *= 0.999 ** delta;
 if (zoom > 20) zoom = 20;
 if (zoom < 0.05) zoom = 0.05;
 canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
 opt.e.preventDefault();
 opt.e.stopPropagation();
 });

 const handleSave = () => {
 if (fabricRef.current && !isInitialLoad.current && !isInternalUpdate.current) {
 const json = JSON.stringify(fabricRef.current.toJSON());
 lastSavedData.current = json;
 // 產生 PNG 快照供 Word 匯出使用
 const pngDataUrl = fabricRef.current.toDataURL({ format: 'png', multiplier: 2 });
 onSaveRef.current(json, fabricRef.current.getHeight(), pngDataUrl);
 }
 };

 canvas.on('object:modified', handleSave);
 canvas.on('object:added', handleSave);
 canvas.on('object:removed', handleSave);
 canvas.on('path:created', handleSave);

 const handleKeyDown = (e: KeyboardEvent) => {
 const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '') || 
 (document.activeElement as HTMLElement)?.isContentEditable;
 if (isInput) return;

 if ((e.key === 'Delete' || e.key === 'Backspace')) {
 const activeObjects = canvas.getActiveObjects();
 if (activeObjects.length > 0) {
 canvas.remove(...activeObjects);
 canvas.discardActiveObject().renderAll();
 }
 }
 if (e.ctrlKey || e.metaKey) {
 if (e.key === 'c') { e.preventDefault(); copy(); }
 if (e.key === 'v') { e.preventDefault(); paste(); }
 if (e.key === 'x') { e.preventDefault(); cut(); }
 }
 };

 const handleBeforePrint = () => {
 if (!fabricRef.current) return;
 const canvas = fabricRef.current;
 const canvasAny = canvas as any;
 
 // Save current state
 canvasAny.originalViewportTransform = [...(canvas.viewportTransform || [])];
 canvasAny.originalWidth = canvas.getWidth();
 canvasAny.originalHeight = canvas.getHeight();
 
 // Calculate bounding box of all objects
 const objects = canvas.getObjects();
 if (objects.length > 0) {
 // Reset viewport temporarily to calculate true bounds
 canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
 
 let minX = Infinity, minY = Infinity, mxX = -Infinity, mxY = -Infinity;
 objects.forEach(obj => {
 const br = obj.getBoundingRect(true, true);
 if (br.left < minX) minX = br.left;
 if (br.top < minY) minY = br.top;
 if (br.left + br.width > mxX) mxX = br.left + br.width;
 if (br.top + br.height > mxY) mxY = br.top + br.height;
 });

 const padding = 20;
 const contentWidth = mxX - minX + padding * 2;
 const contentHeight = mxY - minY + padding * 2;
 
 // Target max width for A4 print
 const printWidth = 800;
 const scale = Math.min(1, printWidth / contentWidth);
 const printHeight = contentHeight * scale;

 canvas.setDimensions({ width: printWidth, height: printHeight });
 canvas.setViewportTransform([scale, 0, 0, scale, -(minX - padding) * scale, -(minY - padding) * scale]);
 }
 canvas.renderAll();
 };

 const handleAfterPrint = () => {
 if (!fabricRef.current) return;
 const canvas = fabricRef.current;
 const canvasAny = canvas as any;
 const origVpt = canvasAny.originalViewportTransform as number[];
 const origWidth = canvasAny.originalWidth as number;
 const origHeight = canvasAny.originalHeight as number;

 if (origVpt && origWidth && origHeight) {
 canvas.setDimensions({ width: origWidth, height: origHeight });
 canvas.setViewportTransform(origVpt);
 canvas.renderAll();
 }
 };

 window.addEventListener('keydown', handleKeyDown);
 window.addEventListener('beforeprint', handleBeforePrint);
 window.addEventListener('afterprint', handleAfterPrint);

 const handleToolReset = () => {
 setTool('select');
 };
 window.addEventListener('fabric:tool_reset', handleToolReset as EventListener);

 return () => {
 cancelAnimationFrame(rafId);
 clearTimeout(timeoutId);
 window.removeEventListener('keydown', handleKeyDown);
 window.removeEventListener('beforeprint', handleBeforePrint);
 window.removeEventListener('afterprint', handleAfterPrint);
 window.removeEventListener('fabric:tool_reset', handleToolReset as EventListener);
 if (fabricRef.current) {
 fabricRef.current.dispose();
 }
 fabricRef.current = null;
 };
 }, [copy, cut, paste]);

 useEffect(() => {
 const canvas = fabricRef.current;
 if (!canvas || containerSize.width === 0 || containerSize.height === 0) return;

 const prevWidth = canvas.getWidth() || containerSize.width;
 const prevHeight = canvas.getHeight() || containerSize.height;
 const viewport = canvas.viewportTransform
 ? [...canvas.viewportTransform]
 : [1, 0, 0, 1, 0, 0];

 canvas.setDimensions({
 width: containerSize.width,
 height: containerSize.height,
 });

 // Keep pan position proportional when viewport size changes.
 if (prevWidth > 0 && prevHeight > 0) {
 viewport[4] = viewport[4] * (containerSize.width / prevWidth);
 viewport[5] = viewport[5] * (containerSize.height / prevHeight);
 }

 canvas.setViewportTransform(viewport as number[]);
 canvas.calcOffset();
 canvas.requestRenderAll();
 }, [containerSize, canvasMounted]);

 const setTool = (tool: 'pen' | 'select' | 'pan' | 'shape') => {
 setActiveTool(tool);
 if (!fabricRef.current) return;
 
 if (tool === 'select') {
 fabricRef.current.isDrawingMode = false;
 fabricRef.current.selection = true;
 fabricRef.current.defaultCursor = 'default';
 fabricRef.current.getObjects().forEach(obj => {
 obj.selectable = true;
 obj.evented = true;
 });
 pendingShapeRef.current = null;
 } else if (tool === 'pen') {
 fabricRef.current.isDrawingMode = true;
 fabricRef.current.selection = false;
 fabricRef.current.defaultCursor = 'default';
 const brush = new fabric.PencilBrush(fabricRef.current);
 brush.color = activeColor;
 brush.width = brushSize;
 fabricRef.current.freeDrawingBrush = brush;
 } else if (tool === 'pan') {
 fabricRef.current.isDrawingMode = false;
 fabricRef.current.selection = false;
 fabricRef.current.defaultCursor = 'grab';
 fabricRef.current.getObjects().forEach(obj => {
 obj.selectable = false;
 obj.evented = false;
 });
 } else if (tool === 'shape') {
 fabricRef.current.isDrawingMode = false;
 fabricRef.current.selection = false;
 fabricRef.current.defaultCursor = 'crosshair';
 fabricRef.current.getObjects().forEach(obj => {
 obj.selectable = false;
 obj.evented = false;
 });
 }
 };

 const handleZoomIn = () => {
 if (!fabricRef.current) return;
 let zoom = fabricRef.current.getZoom();
 zoom *= 1.2;
 if (zoom > 20) zoom = 20;
 fabricRef.current.zoomToPoint(
 { x: fabricRef.current.width! / 2, y: fabricRef.current.height! / 2 }, 
 zoom
 );
 };

 const handleZoomOut = () => {
 if (!fabricRef.current) return;
 let zoom = fabricRef.current.getZoom();
 zoom /= 1.2;
 if (zoom < 0.05) zoom = 0.05;
 fabricRef.current.zoomToPoint(
 { x: fabricRef.current.width! / 2, y: fabricRef.current.height! / 2 }, 
 zoom
 );
 };

 const handleFitAll = () => {
 const canvas = fabricRef.current;
 if (!canvas) return;

 const objects = canvas.getObjects();
 if (objects.length === 0) {
 // If empty, reset to default zoom and center
 canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
 return;
 }

 // Temporarily reset viewport to measure true absolute bounding box
 const currentVpt = [...(canvas.viewportTransform || [])];
 canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);

 let minX = Infinity, minY = Infinity, mxX = -Infinity, mxY = -Infinity;
 objects.forEach(obj => {
 const br = obj.getBoundingRect(true, true);
 if (br.left < minX) minX = br.left;
 if (br.top < minY) minY = br.top;
 if (br.left + br.width > mxX) mxX = br.left + br.width;
 if (br.top + br.height > mxY) mxY = br.top + br.height;
 });

 // Restore old viewport back before applying new one
 canvas.setViewportTransform(currentVpt);

 const padding = 40;
 const contentWidth = mxX - minX + padding * 2;
 const contentHeight = mxY - minY + padding * 2;

 const vpWidth = canvas.getWidth();
 const vpHeight = canvas.getHeight();

 // Calculate scale required to fit both width and height
 const scaleX = vpWidth / contentWidth;
 const scaleY = vpHeight / contentHeight;
 let scale = Math.min(scaleX, scaleY);
 
 if (scale > 2) scale = 2; // don't zoom in too much on tiny items
 if (scale < 0.05) scale = 0.05;

 // Calculate the pan required to center the bounding box
 const scaledContentWidth = (mxX - minX) * scale;
 const scaledContentHeight = (mxY - minY) * scale;
 
 const panX = (vpWidth - scaledContentWidth) / 2 - (minX * scale);
 const panY = (vpHeight - scaledContentHeight) / 2 - (minY * scale);

 canvas.setViewportTransform([scale, 0, 0, scale, panX, panY]);
 canvas.requestRenderAll();
 };

 const selectShape = (type: 'rect' | 'circle' | 'triangle' | 'line' | 'text') => {
 pendingShapeRef.current = type;
 setTool('shape');
 };

 const addImage = () => {
 const input = document.createElement('input');
 input.type = 'file';
 input.accept = 'image/*';
 input.onchange = (e: any) => {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = (event: any) => {
 const imgObj = new Image();
 imgObj.onload = () => {
 const canvas = document.createElement('canvas');
 const MAX_SIDE = 800;
 let width = imgObj.width;
 let height = imgObj.height;

 if (width > height && width > MAX_SIDE) {
 height = Math.round((height * MAX_SIDE) / width);
 width = MAX_SIDE;
 } else if (height > width && height > MAX_SIDE) {
 width = Math.round((width * MAX_SIDE) / height);
 height = MAX_SIDE;
 }

 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx?.drawImage(imgObj, 0, 0, width, height);

 // Compress to JPEG with 75% quality to significantly reduce base64 size
 const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

 fabric.Image.fromURL(compressedDataUrl, (img) => {
 if (img && fabricRef.current) {
 img.set({ lockScalingFlip: true });
 img.scaleToWidth(300);
 
 const vpt = fabricRef.current.viewportTransform;
 const zoom = fabricRef.current.getZoom();
 const width = fabricRef.current.getWidth();
 const height = fabricRef.current.getHeight();

 if (vpt && width && height) {
 const screenCenterX = (width / 2 - vpt[4]) / zoom;
 const screenCenterY = (height / 2 - vpt[5]) / zoom;
 
 img.set({
 left: screenCenterX,
 top: screenCenterY,
 originX: 'center',
 originY: 'center'
 });
 }
 
 fabricRef.current.add(img);
 fabricRef.current.setActiveObject(img);
 fabricRef.current.renderAll();
 }
 });
 };
 imgObj.src = event.target.result;
 };
 reader.readAsDataURL(file);
 };
 input.click();
 };

 useEffect(() => {
 if (fabricRef.current && activeTool === 'pen') {
 (fabricRef.current.freeDrawingBrush as fabric.PencilBrush).color = activeColor;
 (fabricRef.current.freeDrawingBrush as fabric.PencilBrush).width = brushSize;
 }
 }, [activeColor, brushSize, activeTool]);

 return (
 <div className="flex h-full w-full min-h-0 flex-col gap-0 overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <div className="flex flex-wrap items-center gap-1 p-1 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-10 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'select' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => setTool('select')}><MousePointer2 className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">選取 / Select</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'pan' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => setTool('pan')}><Hand className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">平移 / Pan</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'pen' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => setTool('pen')}><Pencil className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">筆記 / Pen</TooltipContent>
 </Tooltip>
 </TooltipProvider>
 
 <Separator orientation="vertical" className="h-4 mx-1" />

 <Popover open={isColorPickerOpen} onOpenChange={setIsColorPickerOpen}>
 <PopoverTrigger asChild>
 <div className="w-5 h-5 rounded-full cursor-pointer transition-all border-none" style={{ backgroundColor: activeColor }} />
 </PopoverTrigger>
 <PopoverContent className="w-48 p-3 rounded-2xl shadow-2xl bg-white dark:bg-slate-800 shadow-[0_8px_30px_rgba(140,120,100,0.05)]">
 <div className="grid grid-cols-4 gap-2">
 {['#336699', '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7', '#000000', '#f8fafc'].map(c => (
 <div key={c} className="w-8 h-8 rounded-full cursor-pointer hover:opacity-90 transition-all shadow-sm" style={{ backgroundColor: c }} onClick={() => {
 setBrushColor(c);
 setUserPickedColor(true);
 setIsColorPickerOpen(false);
 if (fabricRef.current) {
 const activeObjects = fabricRef.current.getActiveObjects();
 if (activeObjects.length > 0) {
 activeObjects.forEach(obj => {
 if (obj.type === 'i-text' || obj.type === 'text') {
 obj.set('fill', c);
 obj.set('stroke', c);
 } else if (obj.type === 'line') {
 obj.set('stroke', c);
 } else {
 obj.set('stroke', c);
 obj.set('fill', c + "20");
 }
 });
 fabricRef.current.requestRenderAll();
 fabricRef.current.fire('object:modified');
 }
 }
 }} />
 ))}
 </div>
 </PopoverContent>
 </Popover>

 {activeTool !== 'pan' && (
 <div 
 className="flex items-center gap-2 px-2 w-32 ml-1"
 onPointerUp={() => {
 if (fabricRef.current && fabricRef.current.getActiveObjects().length > 0) {
 fabricRef.current.fire('object:modified');
 }
 }}
 >
 <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">粗細</span>
 <Slider 
 value={[brushSize]} 
 min={1} 
 max={30} 
 step={1} 
 onValueChange={([v]) => {
 setBrushSize(v);
 if (fabricRef.current) {
 const activeObjects = fabricRef.current.getActiveObjects();
 if (activeObjects.length > 0) {
 activeObjects.forEach(obj => {
 if (obj.type === 'i-text' || obj.type === 'text') {
 const textObj = obj as fabric.IText;
 textObj.set('strokeWidth', v > 5 ? 2 : 0);
 textObj.set('fontWeight', v > 5 ? 'bold' : 'normal');
 } else {
 obj.set('strokeWidth', v);
 }
 });
 fabricRef.current.requestRenderAll();
 }
 }
 }} 
 />
 </div>
 )}

 <Separator orientation="vertical" className="h-4 mx-1" />

 <TooltipProvider>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'shape' && pendingShapeRef.current === 'text' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => selectShape('text')}><Type className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">文字 / Text</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'shape' && pendingShapeRef.current === 'rect' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => selectShape('rect')}><Square className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">矩形 / Rect</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'shape' && pendingShapeRef.current === 'circle' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => selectShape('circle')}><CircleIcon className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">圓形 / Circle</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'shape' && pendingShapeRef.current === 'triangle' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => selectShape('triangle')}><Triangle className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">三角形 / Tri</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant={activeTool === 'shape' && pendingShapeRef.current === 'line' ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => selectShape('line')}><Minus className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">直線 / Line</TooltipContent>
 </Tooltip>
 <Tooltip>
 <TooltipTrigger asChild>
 <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={addImage}><ImageIcon className="h-4 w-4" /></Button>
 </TooltipTrigger>
 <TooltipContent className="text-[10px] font-bold">圖片 / Image</TooltipContent>
 </Tooltip>
 </TooltipProvider>

 <div className="flex-1" />

 <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-500 hover:bg-rose-50 rounded-lg border-none shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow" onClick={() => {
 const activeObjects = fabricRef.current?.getActiveObjects();
 if (activeObjects && activeObjects.length > 0) {
 fabricRef.current?.remove(...activeObjects);
 fabricRef.current?.discardActiveObject().renderAll();
 }
 }}><Trash2 className="h-4 w-4" /></Button>
 </div>

 <div ref={wrapperRef} className="relative flex-1 w-full min-h-0 overflow-hidden bg-[#FBF9F6] dark:bg-[#0a0a0b] dot-grid">
 <canvas ref={canvasRef} className="absolute inset-0 w-full h-full touch-none" />
 </div>
 </div>
 );
}
