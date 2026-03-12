
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
  Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FabricCanvasProps {
  initialData?: string | null;
  initialHeight?: number | null;
  onSave: (data: string, height: number) => void;
}

export function FabricCanvas({ initialData, initialHeight = 500, onSave }: FabricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const onSaveRef = useRef(onSave);
  const clipboard = useRef<any>(null);
  const isInitialLoad = useRef(true);
  
  const [brushColor, setBrushColor] = useState("#336699");
  const [brushSize, setBrushSize] = useState(3);
  const [activeTool, setActiveTool] = useState<'pen' | 'select'>('select');
  const [canvasHeight, setCanvasHeight] = useState(initialHeight || 500);

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
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 1000,
      height: canvasHeight,
      backgroundColor: "transparent",
      uniScaleTransform: true, 
    });

    fabricRef.current = canvas;

    if (initialData && typeof initialData === 'string' && initialData.trim().startsWith('{')) {
      try {
        canvas.loadFromJSON(initialData, () => {
          canvas.renderAll();
          isInitialLoad.current = false;
        });
      } catch (e) {
        isInitialLoad.current = false;
      }
    } else {
      isInitialLoad.current = false;
    }

    const handleSave = () => {
      if (fabricRef.current && !isInitialLoad.current) {
        const json = JSON.stringify(fabricRef.current.toJSON());
        onSaveRef.current(json, canvasHeight);
      }
    };

    canvas.on('object:modified', handleSave);
    canvas.on('object:added', handleSave);
    canvas.on('object:removed', handleSave);

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

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (fabricRef.current) {
        fabricRef.current.dispose();
      }
      fabricRef.current = null;
    };
  }, [canvasHeight, initialData, copy, cut, paste]);

  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setHeight(canvasHeight);
      fabricRef.current.renderAll();
    }
  }, [canvasHeight]);

  const setTool = (tool: 'pen' | 'select') => {
    setActiveTool(tool);
    if (!fabricRef.current) return;
    
    if (tool === 'select') {
      fabricRef.current.isDrawingMode = false;
    } else if (tool === 'pen') {
      fabricRef.current.isDrawingMode = true;
      const brush = new fabric.PencilBrush(fabricRef.current);
      brush.color = brushColor;
      brush.width = brushSize;
      fabricRef.current.freeDrawingBrush = brush;
    }
  };

  const addShape = (type: 'rect' | 'circle' | 'triangle' | 'line' | 'text') => {
    if (!fabricRef.current) return;
    setTool('select');
    
    let object: fabric.Object;
    const center = fabricRef.current.getCenter();
    const common = { 
      left: center.left, 
      top: center.top, 
      fill: brushColor + "20", 
      stroke: brushColor, 
      strokeWidth: 2,
      lockScalingFlip: true 
    };

    switch (type) {
      case 'rect':
        object = new fabric.Rect({ ...common, width: 120, height: 80, rx: 8, ry: 8 });
        break;
      case 'circle':
        object = new fabric.Circle({ ...common, radius: 50 });
        break;
      case 'triangle':
        object = new fabric.Triangle({ ...common, width: 100, height: 100 });
        break;
      case 'line':
        object = new fabric.Line([center.left - 50, center.top, center.left + 50, center.top], { stroke: brushColor, strokeWidth: brushSize });
        break;
      case 'text':
        object = new fabric.IText('雙擊編輯', { ...common, fill: brushColor, fontSize: 22, fontWeight: 'bold' });
        break;
      default:
        return;
    }
    
    fabricRef.current.add(object);
    fabricRef.current.setActiveObject(object);
    fabricRef.current.renderAll();
  };

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        fabric.Image.fromURL(event.target.result, (img) => {
          if (img && fabricRef.current) {
            img.set({ lockScalingFlip: true });
            img.scaleToWidth(300);
            fabricRef.current.add(img);
            fabricRef.current.centerObject(img);
            fabricRef.current.renderAll();
          }
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  useEffect(() => {
    if (fabricRef.current && activeTool === 'pen') {
      (fabricRef.current.freeDrawingBrush as fabric.PencilBrush).color = brushColor;
      (fabricRef.current.freeDrawingBrush as fabric.PencilBrush).width = brushSize;
    }
  }, [brushColor, brushSize, activeTool]);

  return (
    <div className="flex flex-col gap-0 border-none bg-white rounded-3xl overflow-hidden relative shadow-sm ring-1 ring-slate-200">
      
      {/* Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-wrap items-center justify-center gap-1 p-1.5 bg-slate-900/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 transition-all">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl text-white hover:bg-white/20", activeTool === 'select' && "bg-orange-500 hover:bg-orange-600")} onClick={() => setTool('select')}><MousePointer2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">選取 / Select</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-xl text-white hover:bg-white/20", activeTool === 'pen' && "bg-orange-500 hover:bg-orange-600")} onClick={() => setTool('pen')}><Pencil className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">筆記 / Pen</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <Separator orientation="vertical" className="h-6 mx-2 bg-white/20" />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white/20 p-0 relative group">
              <div className="w-5 h-5 rounded-full cursor-pointer border border-white/50 shadow-inner" style={{ backgroundColor: brushColor }} />
              <div className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white/20">{brushSize}</div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-4 rounded-[2rem] shadow-2xl border-none">
            <div className="grid grid-cols-4 gap-2">
              {['#336699', '#3b82f6', '#ef4444', '#22c55e', '#f97316', '#a855f7', '#000000', '#94a3b8'].map(c => (
                <div key={c} className="w-8 h-8 rounded-full cursor-pointer border-2 border-transparent hover:border-primary transition-all" style={{ backgroundColor: c }} onClick={() => setBrushColor(c)} />
              ))}
            </div>
            <div className="mt-4 px-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">粗細 / Stroke</p>
              <Slider value={[brushSize]} min={1} max={30} step={1} onValueChange={([v]) => setBrushSize(v)} />
            </div>
          </PopoverContent>
        </Popover>

        <Separator orientation="vertical" className="h-4 mx-1" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={() => addShape('text')}><Type className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">文字 / Text</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={() => addShape('rect')}><Square className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">矩形 / Rect</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={() => addShape('circle')}><CircleIcon className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">圓形 / Circle</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={() => addShape('triangle')}><Triangle className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">三角形 / Tri</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={() => addShape('line')}><Minus className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">直線 / Line</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-white hover:bg-white/20" onClick={addImage}><ImageIcon className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold">圖片 / Image</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6 mx-2 bg-white/20 hidden sm:block" />

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-400 hover:text-white hover:bg-rose-500 rounded-xl transition-colors" onClick={() => {
                const activeObjects = fabricRef.current?.getActiveObjects();
                if (activeObjects && activeObjects.length > 0) {
                  fabricRef.current?.remove(...activeObjects);
                  fabricRef.current?.discardActiveObject().renderAll();
                }
              }}><Trash2 className="h-4 w-4" /></Button>
            </TooltipTrigger>
            <TooltipContent className="text-[10px] font-bold bg-rose-600 text-white">刪除選取 / Delete Selected</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Canvas Area */}
      <div className="overflow-hidden bg-[#F8F9FA] flex justify-center dot-grid relative border-none min-h-[500px]">
        <canvas ref={canvasRef} className="max-w-full" />
      </div>
    </div>
  );
}
