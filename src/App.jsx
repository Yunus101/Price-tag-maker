import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Upload, Type, ZoomIn, ZoomOut, RotateCcw, 
  Plus, Trash2, AlignCenter, Undo, Redo, LayoutTemplate,
  FileImage, Square, RectangleHorizontal
} from 'lucide-react';

const FONTS = [
  { name: 'Cairo', label: 'Cairo (عربي عصري)' },
  { name: 'Tajawal', label: 'Tajawal (عربي رسمي)' },
  { name: 'Almarai', label: 'Almarai (عربي واضح)' },
  { name: 'Arial', label: 'Arial (قياسي)' },
];

const TEMPLATES = [
  { 
    id: 'a4_land', 
    label: 'A4 عرضي', 
    icon: RectangleHorizontal, 
    width: 3508, 
    height: 2480, 
    bgUrl: './a4.png',
    desc: 'للملصقات الكبيرة',
    layout: {
      t1: { x: 1600, y: 1350, size: 190, color: '#333333', align: 'center', stroke: false },
      p1: { x: 2900, y: 1100, size: 150, color: '#ffffff', stroke: true, strokeColor: '#000000', strokeWidth: 8 }, 
      p2: { x: 2850, y: 1550, size: 240, color: '#FEFB41', stroke: true, strokeColor: '#000000', strokeWidth: 12 }
    }
  },
  { 
    id: 'a5_land', 
    label: 'A5 عرضي', 
    icon: RectangleHorizontal, 
    width: 2480, 
    height: 1748, 
    bgUrl: './a5.png',
    desc: 'للملصقات المتوسطة',
    layout: {
      t1: { x: 1100, y: 950, size: 140, color: '#333333', align: 'center', stroke: false },
      p1: { x: 2050, y: 780, size: 110, color: '#ffffff', stroke: true, strokeColor: '#000000', strokeWidth: 6 },
      p2: { x: 2000, y: 1100, size: 170, color: '#FEFB41', stroke: true, strokeColor: '#000000', strokeWidth: 10 }
    }
  },
  { 
    id: 'shelf', 
    label: 'بانر رف', 
    icon: Square, 
    width: 1772, 
    height: 591, 
    bgUrl: './shelf.png',
    desc: '15سم × 5سم',
    layout: {
      t1: { x: 800, y: 320, size: 100, color: '#333333', align: 'center', stroke: false },
      p1: { x: 1450, y: 250, size: 60, color: '#ffffff', stroke: true, strokeColor: '#000000', strokeWidth: 4 },
      p2: { x: 1420, y: 380, size: 110, color: '#FEFB41', stroke: true, strokeColor: '#000000', strokeWidth: 6 }
    }
  },
  { 
    id: 'custom', 
    label: 'قياس مخصص', 
    icon: FileImage, 
    width: 1080, 
    height: 1080, 
    desc: 'صورة عادية',
    layout: null 
  },
];

const App = () => {
  const [config, setConfig] = useState({
    width: 1080,
    height: 1080,
    elements: [
      { id: 't1', isDefault: true, type: 'text', label: 'اسم المنتج', text: ' 💚🤍 أبو علي 🫡', x: 540, y: 300, size: 80, color: '#333333', font: 'Cairo', stroke: false, strokeColor: '#000000', strokeWidth: 4 },
      { id: 'p1', isDefault: true, type: 'price', label: 'السعر القديم', text: '250', x: 540, y: 500, size: 60, color: '#ffffff', font: 'Cairo', stroke: true, strokeColor: '#000000', strokeWidth: 4, isStrikethrough: true },
      { id: 'p2', isDefault: true, type: 'price', label: 'السعر الجديد', text: '199', x: 540, y: 650, size: 110, color: '#FEFB41', font: 'Cairo', stroke: true, strokeColor: '#000000', strokeWidth: 6 },
    ]
  });

  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [bgImageObj, setBgImageObj] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState('custom');
  
  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [draggingEl, setDraggingEl] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pinchInitialDist, setPinchInitialDist] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const elementsRefs = useRef({}); 

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Cairo:wght@400;700;900&family=Tajawal:wght@400;700;800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    setTimeout(fitToScreen, 100);
    window.addEventListener('resize', fitToScreen);
    return () => window.removeEventListener('resize', fitToScreen);
  }, []);

  useEffect(() => {
    if (selectedId && elementsRefs.current[selectedId]) {
      elementsRefs.current[selectedId].scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [selectedId]);

  useEffect(() => {
    drawCanvas();
  }, [config, bgImageObj, selectedId]);

  const fitToScreen = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const imgWidth = config.width;
    const imgHeight = config.height;
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    const scale = Math.min(scaleX, scaleY) * 0.90;
    setZoom(scale);
    setPanOffset({x: 0, y: 0});
  };

  const drawCanvas = (isExporting = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (canvas.width !== config.width || canvas.height !== config.height) {
        canvas.width = config.width;
        canvas.height = config.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (bgImageObj) {
      ctx.drawImage(bgImageObj, 0, 0, config.width, config.height);
    } else {
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, config.width, config.height);
      ctx.fillStyle = '#9ca3af';
      ctx.font = 'bold 60px Cairo';
      ctx.textAlign = 'center';
      ctx.fillText('جاري تحميل القالب...', config.width/2, config.height/2);
    }

    config.elements.forEach(el => {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${el.size}px "${el.font}", sans-serif`;

      const lines = el.text.toString().split('\n');
      const lineHeight = el.size * 1.2; 
      const startY = el.y - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, index) => {
          const currentY = startY + (index * lineHeight);

          if (el.stroke) {
            ctx.strokeStyle = el.strokeColor;
            ctx.lineWidth = Math.max(2, el.strokeWidth);
            ctx.lineJoin = 'round';
            ctx.strokeText(line, el.x, currentY);
          }

          ctx.fillStyle = el.color;
          ctx.fillText(line, el.x, currentY);

          if (el.isStrikethrough) {
            const metrics = ctx.measureText(line);
            const width = metrics.width;
            const slant = el.size * 0.1; 
            const extension = 25; 

            const lineStartX = el.x - width/2 - extension;
            const lineEndX = el.x + width/2 + extension;
            const lineStartY = currentY + slant;
            const lineEndY = currentY - slant;

            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;

            ctx.beginPath();
            ctx.strokeStyle = '#ffffff'; 
            ctx.lineWidth = Math.max(8, el.size / 5); 
            ctx.moveTo(lineStartX, lineStartY);
            ctx.lineTo(lineEndX, lineEndY);
            ctx.stroke();

            ctx.shadowColor = "transparent"; 
            
            ctx.beginPath();
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = Math.max(4, el.size / 9); 
            ctx.moveTo(lineStartX, lineStartY);
            ctx.lineTo(lineEndX, lineEndY);
            ctx.stroke();

            ctx.restore();
          }
      });

      const isSelected = selectedId === el.id;
      if ((draggingEl === el.id || isSelected) && !isExporting) {
        ctx.strokeStyle = '#22c55e'; 
        ctx.lineWidth = 4;
        ctx.setLineDash([10, 5]);
        
        let maxWidth = 0;
        lines.forEach(line => {
            const w = ctx.measureText(line).width;
            if (w > maxWidth) maxWidth = w;
        });
        const boxHeight = lines.length * lineHeight;
        const displayWidth = maxWidth || 50; 
        const displayHeight = boxHeight || el.size;

        ctx.strokeRect(
            el.x - displayWidth/2 - 20, 
            el.y - displayHeight/2 - 10 + (lineHeight/2) - (el.size/2), 
            displayWidth + 40, 
            displayHeight + 20
        );
      }
      
      ctx.restore();
    });
  };

  const saveToHistory = () => {
    const currentConfigState = JSON.parse(JSON.stringify(config));
    setHistory(prev => {
      const newHistory = [...prev, currentConfigState];
      if (newHistory.length > 20) return newHistory.slice(newHistory.length - 20);
      return newHistory;
    });
    setFuture([]); 
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setFuture(prev => [config, ...prev]);
    setConfig(previous);
    setHistory(newHistory);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setHistory(prev => [...prev, config]);
    setConfig(next);
    setFuture(newFuture);
  };

  const handleSelectTemplate = (templateId) => {
    saveToHistory();
    const template = TEMPLATES.find(t => t.id === templateId);
    setActiveTemplate(templateId);

    if (templateId === 'custom') {
        setBgImageObj(null);
    } else {
        if (template.bgUrl) {
            const img = new Image();
            img.src = template.bgUrl;
            img.onload = () => {
                setBgImageObj(img);
                if (template.layout) {
                    const newElements = config.elements.map(el => {
                        if (template.layout[el.id]) return { ...el, ...template.layout[el.id] };
                        return el;
                    });
                    setConfig({ width: template.width, height: template.height, elements: newElements });
                }
                setTimeout(fitToScreen, 50);
            };
            img.onerror = () => {
               // Ignore error silently
            };
        }
    }
  };

  const getCanvasCoordinates = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const isHit = (canvasCoords, el) => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.font = `bold ${el.size}px "${el.font}", sans-serif`;
    const lines = el.text.toString().split('\n');
    let maxWidth = 0;
    lines.forEach(line => {
        const w = ctx.measureText(line).width;
        if (w > maxWidth) maxWidth = w;
    });
    const w = maxWidth || 50;
    const h = (lines.length * (el.size * 1.2)) || el.size; 
    const padding = 40; 
    return (
      canvasCoords.x >= el.x - w/2 - padding &&
      canvasCoords.x <= el.x + w/2 + padding &&
      canvasCoords.y >= el.y - h/2 - padding &&
      canvasCoords.y <= el.y + h/2 + padding
    );
  };

  const handlePointerDown = (e) => {
    if (e.touches && e.touches.length === 2) {
        e.preventDefault(); 
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        setPinchInitialDist(dist);
        return;
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    if (!containerRef.current.contains(e.target)) return;

    const canvasCoords = getCanvasCoordinates(clientX, clientY);
    const reversedElements = [...config.elements].reverse();
    let hitFound = false;
    for (let el of reversedElements) {
      if (isHit(canvasCoords, el)) {
        saveToHistory();
        setDraggingEl(el.id);
        setSelectedId(el.id);
        setDragStart({ x: canvasCoords.x - el.x, y: canvasCoords.y - el.y });
        hitFound = true;
        break;
      }
    }
    if (!hitFound) {
       setSelectedId(null); 
       setIsPanning(true);
       setDragStart({ x: clientX, y: clientY });
    }
  };

  const handlePointerMove = (e) => {
    if (e.touches && e.touches.length === 2 && pinchInitialDist) {
        e.preventDefault();
        const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        if (pinchInitialDist > 0) {
            const scale = dist / pinchInitialDist;
            setZoom(z => Math.min(Math.max(z * scale, 0.05), 3));
        }
        setPinchInitialDist(dist);
        return;
    }
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    if (draggingEl) {
        e.preventDefault(); 
        const canvasCoords = getCanvasCoordinates(clientX, clientY);
        let newX = canvasCoords.x - dragStart.x;
        let newY = canvasCoords.y - dragStart.y;
        newX = Math.max(0, Math.min(newX, config.width));
        newY = Math.max(0, Math.min(newY, config.height));
        setConfig(prev => ({
            ...prev,
            elements: prev.elements.map(el => el.id === draggingEl ? { ...el, x: newX, y: newY } : el)
        }));
    } else if (isPanning) {
        e.preventDefault(); 
        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;
        setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
        setDragStart({ x: clientX, y: clientY });
    }
  };

  const handlePointerUp = () => {
    setPinchInitialDist(null);
    setDraggingEl(null);
    setIsPanning(false);
  };

  const updateElement = (id, field, value) => {
    setConfig(prev => ({
      ...prev,
      elements: prev.elements.map(el => el.id === id ? { ...el, [field]: value } : el)
    }));
  };

  const handleInputFocus = (id, currentText) => {
    const defaultsToClear = [' 💚🤍 أبو علي 🫡', '250', '199', 'جديد'];
    if (defaultsToClear.includes(currentText)) {
        saveToHistory();
        updateElement(id, 'text', '');
    }
  };

  const addElement = () => {
    saveToHistory();
    const newId = Date.now().toString();
    const baseSize = Math.min(config.width, config.height);
    const newElement = { 
        id: newId, isDefault: false,
        type: 'text', label: 'نص إضافي', text: 'جديد', 
        x: config.width / 2, y: config.height / 2, 
        size: Math.round(baseSize * 0.1), 
        color: '#ffffff', font: 'Cairo', stroke: true, strokeColor: '#000000', strokeWidth: 4 
    };
    setConfig(prev => ({ ...prev, elements: [...prev.elements, newElement] }));
    setSelectedId(newId);
  };

  const deleteElement = (id) => {
    saveToHistory();
    setConfig(prev => ({
        ...prev,
        elements: prev.elements.filter(el => el.id !== id)
    }));
    if (selectedId === id) setSelectedId(null);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          saveToHistory();
          setBgImageObj(img);
          if (activeTemplate === 'custom') {
              const updatedElements = config.elements.map(el => ({
                  ...el, x: img.width/2, y: img.height/2
              }));
              setConfig({ width: img.width, height: img.height, elements: updatedElements });
          }
          setTimeout(fitToScreen, 50);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCanvas(true);
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `price-tag-${activeTemplate}-${Date.now()}.png`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => drawCanvas(false), 200); 
    }, 'image/png');
  };

  const ControlBtn = ({ onClick, icon: Icon, disabled = false, className = "", title="" }) => (
    <button 
        onClick={onClick} 
        disabled={disabled}
        title={title}
        className={`p-2 rounded-lg shadow-md flex items-center justify-center transition-all ${disabled ? 'bg-gray-200 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-100 active:scale-95'} ${className}`}
    >
        <Icon size={20} />
    </button>
  );

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 overflow-hidden text-gray-800 font-sans" dir="rtl">
      <div className="h-[45vh] min-h-[350px] w-full bg-gray-900 shrink-0 relative flex flex-col items-center justify-center border-b-4 border-indigo-600 z-10 shadow-xl">
         <div className="absolute top-4 left-4 z-20 flex flex-col gap-4">
            <div className="flex flex-col gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-xl">
                <ControlBtn onClick={() => setZoom(z => Math.min(z + 0.1, 3))} icon={ZoomIn} title="تكبير" />
                <span className="text-[10px] font-bold text-center select-none text-white drop-shadow-md">{Math.round(zoom * 100)}%</span>
                <ControlBtn onClick={() => setZoom(z => Math.max(z - 0.1, 0.05))} icon={ZoomOut} title="تصغير" />
                <ControlBtn onClick={fitToScreen} icon={RotateCcw} title="ملاءمة الشاشة" className="text-red-500 hover:text-red-600" />
            </div>
            <div className="flex flex-col gap-2 bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-xl">
                <ControlBtn onClick={handleUndo} icon={Undo} title="تراجع" disabled={history.length === 0} />
                <ControlBtn onClick={handleRedo} icon={Redo} title="إعادة" disabled={future.length === 0} />
            </div>
         </div>
         <div ref={containerRef} className="w-full h-full overflow-hidden flex items-center justify-center bg-gray-800 touch-none">
            <canvas 
                ref={canvasRef}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
                className="shadow-2xl bg-white"
                style={{
                    maxWidth: 'none', 
                    width: `${config.width * (zoom)}px`,
                    height: `${config.height * (zoom)}px`,
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
                    transition: isPanning || draggingEl ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: draggingEl ? 'grabbing' : zoom > 0.05 ? 'grab' : 'default',
                    touchAction: 'none'
                }}
            />
         </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 pb-32">
        <div className="p-4 space-y-5">
            <div className="space-y-3">
                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                    <LayoutTemplate size={18} className="text-indigo-600"/> 
                    1. اختر القالب
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {TEMPLATES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => handleSelectTemplate(t.id)}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${activeTemplate === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md transform scale-105' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <t.icon size={24} className="mb-2" />
                            <span className="font-bold text-sm">{t.label}</span>
                            <span className="text-[10px] text-gray-400">{t.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeTemplate === 'custom' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                    <label className="flex flex-col items-center justify-center w-full h-16 border-2 border-dashed border-indigo-200 rounded-lg cursor-pointer bg-indigo-50 hover:bg-indigo-100 transition">
                        <span className="text-sm font-bold text-indigo-700">اضغط لرفع صورة من جهازك</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                </div>
            )}

            <div>
                <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <Type size={18} className="text-indigo-600"/> 
                    2. العناصر والنصوص
                </h3>
                
                <div className="space-y-4">
                    {config.elements.map((el, idx) => (
                        <div 
                            key={el.id} 
                            ref={r => elementsRefs.current[el.id] = r}
                            onClick={() => setSelectedId(el.id)}
                            className={`bg-white p-3 rounded-xl border transition-all cursor-pointer scroll-mt-24 duration-300 ${selectedId === el.id ? 'border-green-500 shadow-md ring-2 ring-green-100 scale-[1.02]' : 'border-gray-200'}`}
                        >
                            <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-bold px-2 py-1 rounded ${el.isDefault ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>
                                    {el.label || `نص إضافي #${idx}`}
                                </span>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); saveToHistory(); updateElement(el.id, 'x', config.width / 2); }}
                                        className="text-gray-400 p-1 hover:bg-gray-100 rounded"
                                        title="توسيط"
                                    >
                                        <AlignCenter size={16}/>
                                    </button>

                                    {!el.isDefault && (
                                        <button 
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); deleteElement(el.id); }} 
                                            className="text-red-500 p-1 hover:bg-red-100 rounded transition-colors bg-red-50 px-2"
                                            title="حذف"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {el.type === 'text' ? (
                                <textarea
                                    rows={el.text.includes('\n') ? 3 : 2}
                                    value={el.text} 
                                    onClick={(e) => e.stopPropagation()} 
                                    onFocus={() => handleInputFocus(el.id, el.text)}
                                    onChange={(e) => updateElement(el.id, 'text', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded mb-3 font-bold focus:border-indigo-500 outline-none text-base resize-y"
                                    style={{fontSize: '16px'}}
                                />
                            ) : (
                                <input 
                                    type="tel"
                                    inputMode="decimal"
                                    value={el.text} 
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={() => handleInputFocus(el.id, el.text)}
                                    onChange={(e) => updateElement(el.id, 'text', e.target.value)}
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded mb-3 font-bold focus:border-indigo-500 outline-none text-base"
                                    style={{fontSize: '16px'}}
                                />
                            )}

                            <div className="grid grid-cols-2 gap-2 text-xs" onClick={(e) => e.stopPropagation()}>
                                <div>
                                    <label className="text-gray-400 block mb-1">الخط</label>
                                    <select 
                                        value={el.font} onChange={(e) => updateElement(el.id, 'font', e.target.value)}
                                        className="w-full p-2 border rounded bg-white text-base"
                                        style={{fontFamily: el.font}}
                                    >
                                        {FONTS.map(f => <option key={f.name} value={f.name}>{f.label}</option>)}
                                    </select>
                                </div>
                                
                                <div>
                                    <label className="text-gray-400 block mb-1">اللون</label>
                                    <div className="flex items-center gap-2 border rounded p-1 h-[42px]">
                                        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 shadow-sm mx-1">
                                            <input 
                                                type="color" 
                                                value={el.color} 
                                                onChange={(e) => updateElement(el.id, 'color', e.target.value)} 
                                                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <div className="flex justify-between text-gray-500 mb-1"><span>حجم الخط</span> <span>{el.size}px</span></div>
                                    <input type="range" min="10" max={config.width/2} value={el.size} onChange={(e) => updateElement(el.id, 'size', parseInt(e.target.value))} className="w-full h-4 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"/>
                                </div>

                                <div className="col-span-2 bg-gray-50 p-2 rounded flex flex-col gap-2">
                                    <div className="flex justify-between items-center">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-600">
                                            <input type="checkbox" checked={el.stroke} onChange={(e) => updateElement(el.id, 'stroke', e.target.checked)} className="text-indigo-600 rounded w-4 h-4"/>
                                            <span>حدود (Outline)</span>
                                        </label>
                                        
                                        {el.stroke && (
                                            <div className="flex items-center gap-2">
                                                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 shadow-sm">
                                                    <input 
                                                        type="color" 
                                                        value={el.strokeColor} 
                                                        onChange={(e) => updateElement(el.id, 'strokeColor', e.target.value)} 
                                                        className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {el.stroke && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">سمك: {el.strokeWidth}</span>
                                            <input 
                                                type="range" 
                                                min="1" 
                                                max="30" 
                                                value={el.strokeWidth} 
                                                onChange={(e) => updateElement(el.id, 'strokeWidth', parseInt(e.target.value))}
                                                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-gray-600"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={addElement} className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 text-gray-500 rounded-xl hover:border-indigo-400 hover:text-indigo-600 font-bold flex justify-center gap-2 transition text-base">
                    <Plus size={18}/> إضافة نص جديد
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white border-t border-gray-200 p-4 absolute bottom-0 w-full shadow-lg z-50">
          <button onClick={handleDownload} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-lg shadow flex justify-center gap-2 active:scale-95 transition">
              <Download size={22} /> حفظ الصورة
          </button>
      </div>

    </div>
  );
};

export default App;


