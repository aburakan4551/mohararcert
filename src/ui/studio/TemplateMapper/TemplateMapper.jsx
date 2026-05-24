/**
 * 🗺️ TemplateMapper.jsx — Official Enterprise Government Template Studio
 * Premium Saudi Health Ministry Visual Studio.
 * Support for: 8-point resize, snap guides, history, presets block library, custom context menu, alignment.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Save, ArrowLeft, Image as ImageIcon, Type, Plus, Layers, 
    MousePointer2, Move, ZoomIn, ZoomOut, Maximize, Eye, EyeOff, Lock, Unlock, 
    Trash2, Copy, AlertTriangle, CheckCircle, Undo2, Redo2, AlignLeft, 
    AlignCenter, AlignRight, Sparkles, Grid, Settings
} from 'lucide-react';
import { SUPPORTED_FIELDS, getFieldMeta } from '../../../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';

// Utility for deep cloning
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

// 🏛️ Official Preset Components Library
const PRESET_BLOCKS = [
    {
        id: 'appreciation_block',
        label: 'نص الشكر والتقدير الرسمي',
        description: 'عنوان الشهادة + نص التكريم + النص الختامي الموحد',
        fields: [
            {
                fieldId: 'certificate_title',
                x: 50, y: 32,
                fontSize: 34,
                color: '#0d1f3c',
                fontFamily: 'Cairo',
                align: 'center',
                width: 700,
                height: 45,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.6,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'شهادة شكر وتقدير'
            },
            {
                fieldId: 'reason',
                x: 50, y: 46,
                fontSize: 22,
                color: '#333333',
                fontFamily: 'Amiri',
                align: 'center',
                width: 850,
                height: 80,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.8,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'يتقدم فرع وزارة الصحة بمنطقة الرياض بخالص الشكر والتقدير والامتنان لجهودكم المتميزة في إنجاح العمل الصحي.'
            },
            {
                fieldId: 'wishes_text',
                x: 50, y: 58,
                fontSize: 18,
                color: '#555555',
                fontFamily: 'Amiri',
                align: 'center',
                width: 600,
                height: 40,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.6,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'سائلين الله له/ـها دوام التوفيق والنجاح والسداد'
            }
        ]
    },
    {
        id: 'signature_block',
        label: 'بلوك التوقيع الرسمي المعتمد',
        description: 'توقيع المدير العام ديناميكياً مع الاسم واللقب الوظيفي',
        fields: [
            {
                fieldId: 'manager_signature',
                x: 80, y: 68,
                width: 160,
                height: 90,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false
            },
            {
                fieldId: 'manager_name',
                x: 80, y: 76,
                fontSize: 18,
                color: '#000000',
                fontFamily: 'Cairo',
                align: 'center',
                width: 250,
                height: 35,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.4,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'مدير عام فرع الوزارة'
            }
        ]
    },
    {
        id: 'stamp_block',
        label: 'بلوك الختم الرسمي للوزارة',
        description: 'مساحة الختم الدائري الرسمي لوزارة الصحة',
        fields: [
            {
                fieldId: 'official_stamp',
                x: 50, y: 70,
                width: 120,
                height: 120,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false
            }
        ]
    },
    {
        id: 'qr_verification_block',
        label: 'بلوك التحقق ورمز QR المشفر',
        description: 'رمز الاستجابة السريعة للتحقق + الرقم التسلسلي التلقائي',
        fields: [
            {
                fieldId: 'qr_code',
                x: 20, y: 68,
                width: 80,
                height: 80,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false
            },
            {
                fieldId: 'serial_number',
                x: 20, y: 76,
                fontSize: 12,
                color: '#888888',
                fontFamily: 'monospace',
                align: 'center',
                width: 150,
                height: 25,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.2,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'SN: [serial_number]'
            }
        ]
    },
    {
        id: 'date_block',
        label: 'بلوك التاريخ والتوثيق الرسمي',
        description: 'موقع وتنسيق تاريخ الإصدار الهجري والميلادي',
        fields: [
            {
                fieldId: 'date',
                x: 20, y: 28,
                fontSize: 16,
                color: '#444444',
                fontFamily: 'Cairo',
                align: 'center',
                width: 180,
                height: 30,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.4,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                textContent: 'تاريخ الإصدار: [date]'
            }
        ]
    }
];

export default function TemplateMapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const workspaceRef = useRef(null);
    const canvasRef = useRef(null);

    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [zoom, setZoom] = useState(1);
    
    // UI Visual states
    const [showGuides, setShowGuides] = useState(true);

    // Save & Error Pipeline State
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved', 'error'
    const [saveErrorMessage, setSaveErrorMessage] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(Date.now());
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Undo/Redo History Architecture
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Pointer Interaction State for Drag & Click
    const [isDragging, setIsDragging] = useState(false);
    const dragData = useRef({
        active: false,
        fieldUid: null,
        startX: 0,
        startY: 0,
        initialFieldX: 0,
        initialFieldY: 0,
        moved: false
    });

    // Pointer Interaction State for Resizing
    const [isResizing, setIsResizing] = useState(false);
    const resizeData = useRef({
        active: false,
        fieldUid: null,
        handle: null,
        startX: 0,
        startY: 0,
        initialWidth: 0,
        initialHeight: 0,
        initialX: 0,
        initialY: 0,
        canvasRect: null
    });

    // Snapping Guides State
    const [activeGuides, setActiveGuides] = useState({ x: null, y: null });

    // Custom Glassmorphic Context Menu State
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, fieldUid: null });

    useEffect(() => {
        loadTemplate();
    }, [id]);

    const loadTemplate = () => {
        const stored = localStorage.getItem('official_templates');
        if (stored) {
            const parsed = JSON.parse(stored);
            const found = parsed.find(t => t.id === id);
            if (found) {
                setTemplate(found);
                const loadedFields = (found.fields || []).map(f => ({
                    ...f,
                    _uid: f._uid || `uid_${Math.random().toString(36).substr(2, 9)}`,
                    hidden: f.hidden || false,
                    locked: f.locked || false,
                    lineHeight: f.lineHeight || 1.6,
                    letterSpacing: f.letterSpacing || 0
                }));
                setFields(loadedFields);
                
                // Initialize History Index
                setHistory([deepClone(loadedFields)]);
                setHistoryIndex(0);
                
                setHasUnsavedChanges(false);
                setSaveStatus('saved');
            } else {
                navigate('/studio');
            }
        }
    };

    // Push state onto Undo history stack
    const pushHistory = (newFields) => {
        const newHistory = history.slice(0, historyIndex + 1);
        setHistory([...newHistory, deepClone(newFields)]);
        setHistoryIndex(newHistory.length);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            setHistoryIndex(prevIndex);
            setFields(deepClone(history[prevIndex]));
            setHasUnsavedChanges(true);
            setSaveStatus('unsaved');
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextIndex = historyIndex + 1;
            setHistoryIndex(nextIndex);
            setFields(deepClone(history[nextIndex]));
            setHasUnsavedChanges(true);
            setSaveStatus('unsaved');
        }
    };

    const handleSave = async (showToast = true) => {
        setIsSaving(true);
        setSaveStatus('saving');
        setSaveErrorMessage(null);
        try {
            // Artificial breathing delay for responsive feeling
            await new Promise((resolve) => setTimeout(resolve, 800));

            const stored = localStorage.getItem('official_templates');
            if (stored) {
                let parsed = JSON.parse(stored);
                parsed = parsed.map(t => {
                    if (t.id === id) {
                        return { 
                            ...t, 
                            backgroundUrl: template.backgroundUrl,
                            fields: deepClone(fields) 
                        };
                    }
                    return t;
                });
                localStorage.setItem('official_templates', JSON.stringify(parsed));
                
                // Reverse validation from storage (Integrity check)
                const verification = JSON.parse(localStorage.getItem('official_templates'));
                const savedTemplate = verification.find(t => t.id === id);
                
                if (savedTemplate && savedTemplate.fields.length === fields.length) {
                    setHasUnsavedChanges(false);
                    setLastSaved(Date.now());
                    setSaveStatus('saved');
                    if (showToast) alert('تم حفظ القالب والتحقق من تخزينه بنجاح.');
                } else {
                    throw new Error("فشلت عملية التحقق العكسي من سلامة البيانات في القرص.");
                }
            } else {
                throw new Error("لم يتم العثور على قاعدة بيانات القوالب المحلية.");
            }
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
            setSaveErrorMessage(e.message);
            if (showToast) alert('فشل الحفظ: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save: Every 12s if dirty
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const timer = setTimeout(() => {
            handleSave(false);
        }, 12000);
        return () => clearTimeout(timer);
    }, [fields, template, hasUnsavedChanges]);

    // Warning Interception on exit / page unload
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = 'لديك تعديلات غير محفوظة، هل أنت متأكد من مغادرة الاستوديو؟';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleBack = () => {
        if (hasUnsavedChanges) {
            const confirmExit = window.confirm("تنبيه: لديك تعديلات لم يتم حفظها بعد. هل تريد مغادرة الاستوديو وإلغاء هذه التعديلات؟");
            if (!confirmExit) return;
        }
        navigate('/studio');
    };

    const markDirty = (newFields, skipHistory = false) => {
        setFields(newFields);
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
        if (!skipHistory) {
            pushHistory(newFields);
        }
    };

    const handleBackgroundUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTemplate(p => ({ ...p, backgroundUrl: ev.target.result }));
                setHasUnsavedChanges(true);
                setSaveStatus('unsaved');
            };
            reader.readAsDataURL(file);
        }
    };

    const addField = (fieldId) => {
        const meta = getFieldMeta(fieldId);
        if (!meta) return;

        const newField = {
            _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
            fieldId,
            x: 50, y: 50,
            fontSize: meta.defaultFontSize || 24,
            color: meta.defaultColor || '#000000',
            fontFamily: meta.defaultFontFamily || 'Cairo',
            align: 'center',
            width: meta.defaultWidth || 200,
            height: meta.defaultHeight || 60,
            opacity: 1,
            rotation: 0,
            lineHeight: 1.6,
            letterSpacing: 0,
            hidden: false,
            locked: false,
            textContent: meta.defaultContent || ''
        };
        
        const updated = [newField, ...fields];
        markDirty(updated);
        setSelectedId(newField._uid);
    };

    // Library Preset Blocks Injector
    const addPresetBlock = (presetId) => {
        const block = PRESET_BLOCKS.find(b => b.id === presetId);
        if (!block) return;

        const newFields = block.fields.map(f => {
            const meta = getFieldMeta(f.fieldId);
            return {
                ...f,
                _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
                hidden: false,
                locked: false,
                fontSize: f.fontSize || meta?.defaultFontSize || 24,
                color: f.color || meta?.defaultColor || '#000000',
                fontFamily: f.fontFamily || meta?.defaultFontFamily || 'Cairo',
                width: f.width || meta?.defaultWidth || 200,
                height: f.height || meta?.defaultHeight || 60,
                textContent: f.textContent || meta?.defaultContent || ''
            };
        });

        const updated = [...newFields, ...fields];
        markDirty(updated);
        if (newFields.length > 0) {
            setSelectedId(newFields[0]._uid);
        }
    };

    const updateField = (uid, changes) => {
        const updated = fields.map(f => f._uid === uid ? { ...f, ...changes } : f);
        markDirty(updated, true); // skip extra history during drag, push on release
    };

    const removeField = (uid) => {
        const updated = fields.filter(f => f._uid !== uid);
        markDirty(updated);
        if (selectedId === uid) setSelectedId(null);
    };

    const duplicateField = (uid) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;
        const newField = { 
            ...deepClone(field), 
            _uid: `uid_${Math.random().toString(36).substr(2, 9)}`, 
            x: Math.min(95, field.x + 3), 
            y: Math.min(95, field.y + 3) 
        };
        const updated = [newField, ...fields];
        markDirty(updated);
        setSelectedId(newField._uid);
    };

    // Layer arrangement tools
    const bringToFront = (uid) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;
        const filtered = fields.filter(f => f._uid !== uid);
        markDirty([field, ...filtered]);
    };

    const sendToBack = (uid) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;
        const filtered = fields.filter(f => f._uid !== uid);
        markDirty([...filtered, field]);
    };

    const moveUp = (uid) => {
        const index = fields.findIndex(f => f._uid === uid);
        if (index <= 0) return; 
        const updated = [...fields];
        const temp = updated[index];
        updated[index] = updated[index - 1];
        updated[index - 1] = temp;
        markDirty(updated);
    };

    const moveDown = (uid) => {
        const index = fields.findIndex(f => f._uid === uid);
        if (index < 0 || index >= fields.length - 1) return;
        const updated = [...fields];
        const temp = updated[index];
        updated[index] = updated[index + 1];
        updated[index + 1] = temp;
        markDirty(updated);
    };

    // Absolute Alignments relative to A4 Safe zones
    const alignField = (uid, alignment) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;

        const canvasW = 1122.5;
        const canvasH = 793.7;
        const wPct = ((field.width || 200) / canvasW) * 100;
        const hPct = ((field.height || 60) / canvasH) * 100;

        let changes = {};
        if (alignment === 'left') {
            changes.x = Math.round((10 + wPct / 2) * 10) / 10;
        } else if (alignment === 'right') {
            changes.x = Math.round((90 - wPct / 2) * 10) / 10;
        } else if (alignment === 'centerX') {
            changes.x = 50;
        } else if (alignment === 'top') {
            changes.y = Math.round((10 + hPct / 2) * 10) / 10;
        } else if (alignment === 'bottom') {
            changes.y = Math.round((90 - hPct / 2) * 10) / 10;
        } else if (alignment === 'centerY') {
            changes.y = 50;
        }

        updateField(uid, changes);
        pushHistory(fields.map(f => f._uid === uid ? { ...f, ...changes } : f));
    };

    // Keyboard Shortcuts Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Bypass shortcuts when user typing in text inputs/areas
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
                return;
            }

            // Ctrl+S: Manual Save
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                handleSave(true);
                return;
            }

            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undo();
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y: Redo
            if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                redo();
                return;
            }

            // Escape: Deselect Element
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedId(null);
                return;
            }

            if (!selectedId) return;
            const field = fields.find(f => f._uid === selectedId);
            if (!field) return;

            // Delete / Backspace: Delete selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                removeField(selectedId);
                return;
            }

            // Ctrl+D: Duplicate
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                duplicateField(selectedId);
                return;
            }

            // Arrow Keys Nudging
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (field.locked) return;
                e.preventDefault();
                
                const step = e.shiftKey ? 1.0 : 0.1; // Shift nuds 1%, otherwise 0.1%
                let dx = 0;
                let dy = 0;

                if (e.key === 'ArrowLeft') dx = -step;
                if (e.key === 'ArrowRight') dx = step;
                if (e.key === 'ArrowUp') dy = -step;
                if (e.key === 'ArrowDown') dy = step;

                const newX = Math.round((field.x + dx) * 10) / 10;
                const newY = Math.round((field.y + dy) * 10) / 10;

                updateField(selectedId, { x: newX, y: newY });
                pushHistory(fields.map(f => f._uid === selectedId ? { ...f, x: newX, y: newY } : f));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, fields, historyIndex, history, hasUnsavedChanges]);

    // Close right-click context menu automatically
    useEffect(() => {
        const closeMenu = () => {
            if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [contextMenu]);

    // --- INTERACTION ENGINE: DRAGGING & MOVEMENT --- //
    const handlePointerDown = (e, field) => {
        if (field.locked) return;
        e.preventDefault(); 
        
        // Instant Select
        setSelectedId(field._uid);

        dragData.current = {
            active: true,
            fieldUid: field._uid,
            startX: e.clientX,
            startY: e.clientY,
            initialFieldX: field.x,
            initialFieldY: field.y,
            moved: false
        };
    };

    // --- INTERACTION ENGINE: RESIZING --- //
    const handleResizeStart = (e, field, handle) => {
        e.stopPropagation();
        e.preventDefault();
        
        resizeData.current = {
            active: true,
            fieldUid: field._uid,
            handle: handle,
            startX: e.clientX,
            startY: e.clientY,
            initialWidth: field.width || 200,
            initialHeight: field.height || 60,
            initialX: field.x,
            initialY: field.y,
            canvasRect: canvasRef.current.getBoundingClientRect()
        };
        setIsResizing(true);
    };

    // Global Pointer Move orchestrator (combines snap-drag & zoom-resize calculations)
    const handleGlobalPointerMove = (e) => {
        // A. RESIZING TRACKER
        if (resizeData.current.active) {
            const data = resizeData.current;
            const dx = e.clientX - data.startX;
            const dy = e.clientY - data.startY;
            
            // Adjust for canvas transform scaling (zoom factor)
            const dxCanvas = dx / zoom;
            const dyCanvas = dy / zoom;
            
            const canvasW = data.canvasRect.width / zoom;
            const canvasH = data.canvasRect.height / zoom;
            
            let newWidth = data.initialWidth;
            let newHeight = data.initialHeight;
            let newX = data.initialX;
            let newY = data.initialY;
            
            const handle = data.handle;
            
            if (handle.includes('r')) {
                newWidth = Math.max(20, data.initialWidth + dxCanvas);
                newX = data.initialX + (((newWidth - data.initialWidth) / 2) / canvasW) * 100;
            } else if (handle.includes('l')) {
                newWidth = Math.max(20, data.initialWidth - dxCanvas);
                newX = data.initialX - (((newWidth - data.initialWidth) / 2) / canvasW) * 100;
            }
            
            if (handle.includes('b')) {
                newHeight = Math.max(10, data.initialHeight + dyCanvas);
                newY = data.initialY + (((newHeight - data.initialHeight) / 2) / canvasH) * 100;
            } else if (handle.includes('t')) {
                newHeight = Math.max(10, data.initialHeight - dyCanvas);
                newY = data.initialY - (((newHeight - data.initialHeight) / 2) / canvasH) * 100;
            }
            
            newWidth = Math.round(newWidth);
            newHeight = Math.round(newHeight);
            newX = Math.round(newX * 10) / 10;
            newY = Math.round(newY * 10) / 10;
            
            updateField(data.fieldUid, {
                width: newWidth,
                height: newHeight,
                x: newX,
                y: newY
            });
            return;
        }

        // B. DRAG TRACKER
        if (!dragData.current.active) return;

        const dx = e.clientX - dragData.current.startX;
        const dy = e.clientY - dragData.current.startY;

        // Drag Threshold
        if (!dragData.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            return;
        }

        if (!dragData.current.moved) {
            dragData.current.moved = true;
            setIsDragging(true);
        }

        const rect = canvasRef.current.getBoundingClientRect();
        // Convert screen pixel delta to zoomed coordinate percentages
        const xPctDelta = (dx / rect.width) * 100;
        const yPctDelta = (dy / rect.height) * 100;

        let newX = dragData.current.initialFieldX + xPctDelta;
        let newY = dragData.current.initialFieldY + yPctDelta;

        // Smart Snapping Architecture
        let guideX = null;
        let guideY = null;
        const snapThreshold = 1.2; // Snap window in percent

        // Snap to center axes
        if (Math.abs(newX - 50) < snapThreshold) {
            newX = 50;
            guideX = 50;
        }
        if (Math.abs(newY - 50) < snapThreshold) {
            newY = 50;
            guideY = 50;
        }

        // Snap to safe margins
        if (Math.abs(newX - 5) < snapThreshold) {
            newX = 5;
            guideX = 5;
        } else if (Math.abs(newX - 95) < snapThreshold) {
            newX = 95;
            guideX = 95;
        }

        if (Math.abs(newY - 5) < snapThreshold) {
            newY = 5;
            guideY = 5;
        } else if (Math.abs(newY - 95) < snapThreshold) {
            newY = 95;
            guideY = 95;
        }

        // Object-to-object snaps with sibling layers
        fields.forEach(other => {
            if (other._uid === dragData.current.fieldUid || other.hidden) return;
            if (Math.abs(newX - other.x) < snapThreshold) {
                newX = other.x;
                guideX = other.x;
            }
            if (Math.abs(newY - other.y) < snapThreshold) {
                newY = other.y;
                guideY = other.y;
            }
        });

        // Restrict within canvas borders
        newX = Math.max(0, Math.min(100, newX));
        newY = Math.max(0, Math.min(100, newY));

        newX = Math.round(newX * 10) / 10;
        newY = Math.round(newY * 10) / 10;

        updateField(dragData.current.fieldUid, { x: newX, y: newY });
        setActiveGuides({ x: guideX, y: guideY });
    };

    const handleGlobalPointerUp = () => {
        // Capture drag completion and push to undo/redo history
        if (dragData.current.active) {
            dragData.current.active = false;
            setIsDragging(false);
            setActiveGuides({ x: null, y: null });
            pushHistory(fields); // push finalized coords
        }

        // Capture resize completion and push to undo/redo history
        if (resizeData.current.active) {
            resizeData.current.active = false;
            setIsResizing(false);
            pushHistory(fields);
        }
    };

    useEffect(() => {
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
        };
    }, [fields, zoom]);

    if (!template) return <div style={{ background: '#111', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo', fontWeight: 800 }}>جاري تحميل استوديو المخططات الرسمي...</div>;

    const selectedField = fields.find(f => f._uid === selectedId);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#121214', color: '#f3f4f6', overflow: 'hidden', fontFamily: 'Cairo', direction: 'rtl' }}>
            
            {/* ─── 🏛️ TOP ACTION HEADBAR ─── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#1c1c1f', padding: '10px 24px', borderBottom: '1px solid #2d2d34', zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={handleBack} style={{ background: '#27272a', border: 'none', cursor: 'pointer', color: '#f3f4f6', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '12px' }}>
                        <ArrowLeft size={16} /> العودة للاستوديو
                    </button>
                    
                    <div style={{ height: '24px', width: '1px', background: '#2d2d34' }} />
                    
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 900, color: '#f3f4f6', lineHeight: 1 }}>{template.name}</h2>
                            
                            {/* Rich Pulsing Status Badge */}
                            {saveStatus === 'saved' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                                    <CheckCircle size={10}/> تم الحفظ والتأمين
                                </span>
                            )}
                            {saveStatus === 'saving' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#0ea5e9', background: 'rgba(14, 165, 233, 0.1)', padding: '2px 8px', borderRadius: '20px', animation: 'pulse 1.2s infinite' }}>
                                    ⏳ جاري التخزين تلقائياً...
                                </span>
                            )}
                            {saveStatus === 'unsaved' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                                    ● تعديلات غير محفوظة
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span 
                                    onClick={() => handleSave(true)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '20px', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)' }}
                                    title={saveErrorMessage}
                                >
                                    <AlertTriangle size={10}/> فشل التخزين! انقر للإعادة
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '10px', color: '#0ea5e9', fontWeight: 800, letterSpacing: '0.5px' }}>Saudi Health Ministry Certificate Engine</span>
                    </div>
                </div>

                {/* History & Zoom Controls toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#27272a', padding: '2px', borderRadius: '8px' }}>
                        <button 
                            onClick={undo} 
                            disabled={historyIndex <= 0} 
                            style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: historyIndex <= 0 ? '#52525b' : '#f3f4f6', borderRadius: '6px' }}
                            title="تراجع (Ctrl+Z)"
                        >
                            <Undo2 size={16} />
                        </button>
                        <button 
                            onClick={redo} 
                            disabled={historyIndex >= history.length - 1} 
                            style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: historyIndex >= history.length - 1 ? '#52525b' : '#f3f4f6', borderRadius: '6px' }}
                            title="إعادة تطبيق (Ctrl+Shift+Z)"
                        >
                            <Redo2 size={16} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: '#27272a', padding: '2px', borderRadius: '8px' }}>
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}><ZoomOut size={14} /></button>
                        <span style={{ fontSize: '11px', fontWeight: 800, minWidth: '42px', textAlign: 'center', color: '#f3f4f6' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3.0, z + 0.1))} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }}><ZoomIn size={14} /></button>
                        <button onClick={() => setZoom(1.0)} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#a1a1aa' }} title="حجم حقيقي"><Maximize size={14} /></button>
                    </div>

                    <button 
                        onClick={() => setShowGuides(g => !g)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', background: showGuides ? 'rgba(16, 185, 129, 0.15)' : '#27272a', border: 'none', cursor: 'pointer', color: showGuides ? '#10b981' : '#a1a1aa', borderRadius: '8px', fontSize: '11px', fontWeight: 800 }}
                    >
                        <Grid size={14} /> الهوامش الآمنة
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <label style={{ cursor: 'pointer' }}>
                        <input type="file" accept="image/png, image/jpeg, image/pdf" style={{ display: 'none' }} onChange={handleBackgroundUpload} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#27272a', borderRadius: '8px', fontSize: '11px', fontWeight: 800, color: '#f3f4f6' }}>
                            <ImageIcon size={14} /> استبدال الخلفية الرسمية
                        </div>
                    </label>
                    <Button variant="primary" onClick={() => handleSave(true)} disabled={isSaving} leftIcon={Save} style={{ fontSize: '11px', fontWeight: 800 }}>{isSaving ? 'جاري التخزين...' : 'حفظ التعديلات يدوياً'}</Button>
                </div>
            </div>

            {/* ─── MAIN WORKSPACE PANELS ─── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                
                {/* 👈 LEFT BAR: PRESET LIBRARY & FIELDS */}
                <div style={{ width: '310px', background: '#1c1c1f', borderLeft: '1px solid #2d2d34', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    
                    {/* Presets Library Panel */}
                    <div style={{ padding: '16px', borderBottom: '1px solid #2d2d34', background: '#18181b' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981' }}><Sparkles size={14} /> مكتبة المكونات الرسمية (Presets)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {PRESET_BLOCKS.map(block => (
                                <button 
                                    key={block.id} 
                                    onClick={() => addPresetBlock(block.id)} 
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '8px 12px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '6px', cursor: 'pointer', textAlign: 'right', transition: 'all 0.2s', width: '100%' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#2d2d34'}
                                >
                                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#f3f4f6' }}>{block.label}</span>
                                    <span style={{ fontSize: '9px', color: '#a1a1aa', marginTop: '2px' }}>{block.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Standard Elements Panel */}
                    <div style={{ padding: '16px', borderBottom: '1px solid #2d2d34', background: '#18181b' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#0ea5e9' }}><Plus size={14} /> إضافة حقول فردية</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {SUPPORTED_FIELDS.map(f => (
                                <button key={f.id} onClick={() => addField(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 4px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: '#f3f4f6', transition: 'all 0.15s' }}>
                                    {f.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Layers Panel */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #2d2d34', background: '#1c1c1f' }}>
                            <h3 style={{ fontSize: '12px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', color: '#a1a1aa' }}><Layers size={14} /> الطبقات والترتيب (Layers)</h3>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#141416' }}>
                            {fields.map((f, idx) => {
                                const meta = getFieldMeta(f.fieldId);
                                const isSelected = selectedId === f._uid;
                                return (
                                    <div 
                                        key={f._uid} 
                                        onClick={() => setSelectedId(f._uid)} 
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            padding: '8px 12px', 
                                            background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#222226', 
                                            color: isSelected ? '#10b981' : '#f3f4f6', 
                                            borderRadius: '8px', 
                                            cursor: 'pointer', 
                                            gap: '8px', 
                                            border: isSelected ? '1px solid #10b981' : '1px solid #2d2d34', 
                                            transition: 'all 0.15s' 
                                        }}
                                    >
                                        <div style={{ flex: 1, fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {meta?.label || f.fieldId}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { hidden: !f.hidden }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: f.hidden ? 0.3 : 0.8 }}><Eye size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { locked: !f.locked }) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: f.locked ? 0.8 : 0.3 }}>{f.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
                                        </div>
                                    </div>
                                );
                            })}
                            {fields.length === 0 && <div style={{ fontSize: '11px', color: '#52525b', textAlign: 'center', padding: '24px 0' }}>مساحة العمل خالية تماماً.</div>}
                        </div>
                    </div>
                </div>

                {/* 🎛️ CENTER BOARD: VIRTUAL A4 CANVAS */}
                <div 
                    ref={workspaceRef} 
                    style={{ flex: 1, background: '#0e0e10', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }} 
                    onClick={(e) => { if (e.target === workspaceRef.current || e.target.parentElement === workspaceRef.current) setSelectedId(null) }}
                >
                    <div 
                        ref={canvasRef}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ visible: false }); // Reset
                        }}
                        style={{
                            width: '1122.5px', // Base landscape A4
                            height: '793.7px',
                            background: template.backgroundUrl ? `url(${template.backgroundUrl}) center/contain no-repeat` : '#ffffff',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.8)',
                            transform: `scale(${zoom})`,
                            transformOrigin: 'center center',
                            transition: (isDragging || isResizing) ? 'none' : 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                            overflow: 'hidden'
                        }}
                    >
                        {!template.backgroundUrl && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#d1d5db', fontWeight: 900, fontSize: '24px' }}>الخلفية الرسمية غير متوفرة</div>}

                        {/* 🛡️ Canvas Safe Print Zone Guides */}
                        {showGuides && (
                            <>
                                {/* Bleed margin (2% safe edge) */}
                                <div style={{ position: 'absolute', top: '2%', left: '2%', right: '2%', bottom: '2%', border: '1px dashed rgba(239, 68, 68, 0.25)', pointerEvents: 'none', zIndex: 1 }} />
                                {/* Printable area margin (5% limit zone) */}
                                <div style={{ position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%', border: '1px dashed rgba(16, 185, 129, 0.35)', pointerEvents: 'none', zIndex: 1 }} />
                                
                                {/* Faint center guidelines */}
                                <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: '1px', borderLeft: '1px dotted rgba(0, 0, 0, 0.06)', pointerEvents: 'none', zIndex: 1 }} />
                                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', borderTop: '1px dotted rgba(0, 0, 0, 0.06)', pointerEvents: 'none', zIndex: 1 }} />
                            </>
                        )}

                        {/* ⚡ Visual Active Snapping Guidelines */}
                        {activeGuides.y !== null && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: `${activeGuides.y}%`, height: '1px', borderTop: '1px dashed #ef4444', zIndex: 999, pointerEvents: 'none' }} />
                        )}
                        {activeGuides.x !== null && (
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${activeGuides.x}%`, width: '1px', borderLeft: '1px dashed #ef4444', zIndex: 999, pointerEvents: 'none' }} />
                        )}

                        {/* Map Layers (Index 0 is top-most) */}
                        {[...fields].reverse().map((f, reverseIdx) => {
                            if (f.hidden) return null;
                            const meta = getFieldMeta(f.fieldId);
                            const isSelected = selectedId === f._uid;
                            const zIndex = 10 + reverseIdx;
                            
                            return (
                                <div
                                    key={f._uid}
                                    onPointerDown={(e) => handlePointerDown(e, f)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedId(f._uid);
                                        setContextMenu({
                                            visible: true,
                                            x: e.clientX,
                                            y: e.clientY,
                                            fieldUid: f._uid
                                        });
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${f.rotation || 0}deg)`,
                                        zIndex: zIndex,
                                        opacity: f.opacity || 1,
                                        cursor: f.locked ? 'default' : (isDragging && isSelected ? 'grabbing' : 'grab'),
                                        border: isSelected ? '2px solid #0EA5E9' : '1px dashed rgba(0,0,0,0.08)',
                                        padding: meta?.type === 'text' || meta?.type === 'textarea' ? '0' : '4px',
                                        color: f.color || '#000',
                                        fontFamily: f.fontFamily || 'Cairo',
                                        fontSize: `${f.fontSize}px`,
                                        textAlign: f.align || 'center',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: f.lineHeight || 1.6,
                                        letterSpacing: `${f.letterSpacing || 0}px`,
                                        width: f.width ? `${f.width}px` : '100%',
                                        userSelect: 'none'
                                    }}
                                >
                                    {meta?.type === 'text' || meta?.type === 'textarea' ? (
                                        <span style={{ fontWeight: f.fontWeight || meta.defaultWeight || 'bold' }}>
                                            {f.textContent || `[${meta?.label}]`}
                                        </span>
                                    ) : (
                                        <div style={{ width: '100%', height: `${f.height}px`, background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '11px', border: '1px dashed rgba(0,0,0,0.15)', fontWeight: 800 }}>
                                            {meta?.label} (Zone)
                                        </div>
                                    )}

                                    {/* 8-Point Resize Handles Overlay */}
                                    {isSelected && !f.locked && (
                                        <>
                                            {['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'].map(handle => {
                                                let style = {
                                                    position: 'absolute',
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#ffffff',
                                                    border: '2.5px solid #0ea5e9',
                                                    borderRadius: '2px', // Figma square handle
                                                    zIndex: 200,
                                                    transform: 'translate(-50%, -50%)',
                                                    pointerEvents: 'auto'
                                                };
                                                
                                                if (handle.includes('t')) style.top = '0%';
                                                if (handle.includes('b')) style.top = '100%';
                                                if (handle.includes('c') || handle.includes('m')) style.top = '50%';
                                                
                                                if (handle.includes('l')) style.left = '0%';
                                                if (handle.includes('r')) style.left = '100%';
                                                if (handle.includes('c') || handle.includes('m')) style.left = '50%';
                                                
                                                let cursor = 'default';
                                                if (handle === 'tl' || handle === 'br') cursor = 'nwse-resize';
                                                if (handle === 'tr' || handle === 'bl') cursor = 'nesw-resize';
                                                if (handle === 'tc' || handle === 'bc') cursor = 'ns-resize';
                                                if (handle === 'ml' || handle === 'mr') cursor = 'ew-resize';
                                                
                                                style.cursor = cursor;
                                                
                                                return (
                                                    <div 
                                                        key={handle}
                                                        style={style}
                                                        onPointerDown={(e) => handleResizeStart(e, f, handle)}
                                                    />
                                                );
                                            })}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 👉 RIGHT BAR: PROPERTIES INSPECTOR */}
                <div style={{ width: '330px', background: '#1c1c1f', borderRight: '1px solid #2d2d34', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid #2d2d34' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: 900 }}>لوحة الخصائص (Properties)</h3>
                    </div>
                    
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {selectedField ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px' }}>
                                
                                {/* 📐 Alignment Toolbar */}
                                <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', border: '1px solid #2d2d34' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#a1a1aa', marginBottom: '10px' }}>أدوات المحاذاة (Align)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                        <button onClick={() => alignField(selectedId, 'left')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="محاذاة لليسار">يسار</button>
                                        <button onClick={() => alignField(selectedId, 'centerX')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="توسيط أفقي">أفقي</button>
                                        <button onClick={() => alignField(selectedId, 'right')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="محاذاة لليمين">يمين</button>
                                        <button onClick={() => alignField(selectedId, 'top')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="محاذاة لأعلى">أعلى</button>
                                        <button onClick={() => alignField(selectedId, 'centerY')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="توسيط عمودي">عمودي</button>
                                        <button onClick={() => alignField(selectedId, 'bottom')} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }} title="محاذاة لأسفل">أسفل</button>
                                    </div>
                                </div>

                                {/* 📐 Geometry Group */}
                                <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', border: '1px solid #2d2d34' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#a1a1aa', marginBottom: '10px' }}>الأبعاد والموقع (Geometry)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>السين X (%)
                                            <input type="number" step="0.5" value={selectedField.x} onChange={e => { updateField(selectedId, { x: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, x: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>الصاد Y (%)
                                            <input type="number" step="0.5" value={selectedField.y} onChange={e => { updateField(selectedId, { y: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, y: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>العرض (px)
                                            <input type="number" step="10" value={selectedField.width || 0} onChange={e => { updateField(selectedId, { width: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, width: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>الارتفاع (px)
                                            <input type="number" step="10" value={selectedField.height || 0} onChange={e => { updateField(selectedId, { height: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, height: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                    </div>
                                </div>

                                {/* 🖋️ Typography Group */}
                                {(getFieldMeta(selectedField.fieldId)?.type === 'text' || getFieldMeta(selectedField.fieldId)?.type === 'textarea') && (
                                    <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', border: '1px solid #2d2d34' }}>
                                        <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#a1a1aa', marginBottom: '10px' }}>النصوص والمحتوى (Typography)</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>محتوى الحقل النصي
                                                <textarea value={selectedField.textContent || ''} onChange={e => { updateField(selectedId, { textContent: e.target.value }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, textContent: e.target.value } : f)); }} placeholder={`نص افتراضي لـ ${getFieldMeta(selectedField.fieldId)?.label}`} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px', minHeight: '60px', resize: 'vertical' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>حجم الخط (px)
                                                <input type="number" value={selectedField.fontSize} onChange={e => { updateField(selectedId, { fontSize: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, fontSize: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>اللون
                                                <input type="color" value={selectedField.color} onChange={e => { updateField(selectedId, { color: e.target.value }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, color: e.target.value } : f)); }} style={{ width: '100%', height: '30px', border: '1px solid #2d2d34', borderRadius: '4px', marginTop: '4px', cursor: 'pointer', padding: '0' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>نوع الخط الرسمي
                                                <select value={selectedField.fontFamily} onChange={e => { updateField(selectedId, { fontFamily: e.target.value }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, fontFamily: e.target.value } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked}>
                                                    <option value="Cairo">Cairo (عصري ومكثف)</option>
                                                    <option value="Amiri">Amiri (كلاسيكي رسمي)</option>
                                                    <option value="Tajawal">Tajawal</option>
                                                </select>
                                            </label>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>ارتفاع السطر
                                                <input type="number" step="0.1" value={selectedField.lineHeight || 1.6} onChange={e => { updateField(selectedId, { lineHeight: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, lineHeight: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                            <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>تباعد الأحرف
                                                <input type="number" step="1" value={selectedField.letterSpacing || 0} onChange={e => { updateField(selectedId, { letterSpacing: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, letterSpacing: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {/* 🎨 Layer Arrangement & Controls */}
                                <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', border: '1px solid #2d2d34' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#a1a1aa', marginBottom: '10px' }}>ترتيب الطبقة (Layer Depth)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                        <button onClick={() => bringToFront(selectedId)} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>جلب للمقدمة</button>
                                        <button onClick={() => sendToBack(selectedId)} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>إرسال للخلف</button>
                                        <button onClick={() => moveUp(selectedId)} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>رفع طبقة</button>
                                        <button onClick={() => moveDown(selectedId)} style={{ padding: '6px', background: '#222226', border: '1px solid #2d2d34', cursor: 'pointer', color: '#f3f4f6', borderRadius: '4px', fontSize: '10px', fontWeight: 800 }}>خفض طبقة</button>
                                    </div>
                                </div>

                                {/* 🎨 Appearance Group */}
                                <div style={{ background: '#18181b', padding: '12px', borderRadius: '8px', border: '1px solid #2d2d34' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: '#a1a1aa', marginBottom: '10px' }}>المظهر (Appearance)</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>الشفافية
                                            <input type="number" step="0.1" min="0" max="1" value={selectedField.opacity} onChange={e => { updateField(selectedId, { opacity: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, opacity: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                        <label style={{ fontSize: '10px', color: '#a1a1aa', fontWeight: 700 }}>التدوير (درجة)
                                            <input type="number" step="1" value={selectedField.rotation || 0} onChange={e => { updateField(selectedId, { rotation: Number(e.target.value) }); pushHistory(fields.map(f => f._uid === selectedId ? { ...f, rotation: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: '#222226', border: '1px solid #2d2d34', borderRadius: '4px', color: '#f3f4f6', marginTop: '4px' }} disabled={selectedField.locked} />
                                        </label>
                                    </div>
                                </div>

                                {/* ⚡ Actions Group */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <Button variant="outline" size="sm" onClick={() => duplicateField(selectedId)} leftIcon={Copy} style={{ flex: 1, fontSize: '11px', fontWeight: 800 }}>تكرار العنصر</Button>
                                    <Button variant="outline" size="sm" onClick={() => removeField(selectedId)} leftIcon={Trash2} style={{ flex: 1, fontSize: '11px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontWeight: 800 }}>حذف</Button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: '#a1a1aa', textAlign: 'center', gap: '8px', padding: '24px' }}>
                                <MousePointer2 size={28} style={{ opacity: 0.4, color: '#0ea5e9' }} />
                                <span style={{ fontSize: '11px', fontWeight: 800 }}>اضغط على أي عنصر في الـ Canvas أو لوحة الطبقات لتعديل أبعاده ومحاذاته.</span>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* ─── Custom Floating Glassmorphic Context Menu ─── */}
            {contextMenu.visible && (
                <div 
                    style={{
                        position: 'fixed',
                        top: contextMenu.y,
                        left: contextMenu.x,
                        background: 'rgba(28, 28, 31, 0.85)',
                        backdropFilter: 'blur(16px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                        borderRadius: '10px',
                        padding: '6px',
                        zIndex: 9999,
                        minWidth: '160px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                    }}
                >
                    <button 
                        onClick={() => {
                            const f = fields.find(x => x._uid === contextMenu.fieldUid);
                            if (f) updateField(f._uid, { locked: !f.locked });
                        }} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#f3f4f6', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>قفل / فتح الحركة</span>
                        <Lock size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <button 
                        onClick={() => {
                            const f = fields.find(x => x._uid === contextMenu.fieldUid);
                            if (f) updateField(f._uid, { hidden: !f.hidden });
                        }} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#f3f4f6', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>إخفاء / إظهار</span>
                        <EyeOff size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <button 
                        onClick={() => duplicateField(contextMenu.fieldUid)} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#f3f4f6', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>تكرار العنصر</span>
                        <Copy size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button 
                        onClick={() => bringToFront(contextMenu.fieldUid)} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#f3f4f6', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 800, borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        جلب للمقدمة
                    </button>
                    <button 
                        onClick={() => sendToBack(contextMenu.fieldUid)} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#f3f4f6', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 800, borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        إرسال للخلف
                    </button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button 
                        onClick={() => removeField(contextMenu.fieldUid)} 
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'right', fontSize: '11px', fontWeight: 900, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>حذف العنصر</span>
                        <Trash2 size={12} />
                    </button>
                </div>
            )}

            {/* Custom Animation Keyframes Injection */}
            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
