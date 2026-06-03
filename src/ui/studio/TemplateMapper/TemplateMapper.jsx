/**
 * 🗺️ TemplateMapper.jsx — Saudi Government Official Certificate & Publishing Studio
 * Decoupled visual engine integrating:
 *  - SelectionEngine (Multi-select, distribute, alignments)
 *  - ClipboardEngine (Ctrl+C, Ctrl+V, Alt+Drag copy)
 *  - HistoryEngine (Deep Stack Undo/Redo)
 *  - PresetStorageAdapter (Storage provider agnostic presets)
 *  - ImageProcessor (Canvas compression, oval cropping, thumbnails)
 *  - BackgroundQueue (Task batch tracking, retries, cancellations)
 *  - ExportEngine (Headless offscreen multi-page renders)
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Save, ArrowLeft, Image as ImageIcon, Type, Plus, Layers,
    MousePointer2, Move, ZoomIn, ZoomOut, Maximize, Eye, EyeOff, Lock, Unlock,
    Trash2, Copy, AlertTriangle, CheckCircle, Undo2, Redo2, AlignLeft,
    AlignCenter, AlignRight, Sparkles, Grid, Settings, Clipboard, List, Check, X, RefreshCw, Eye as ViewIcon, ShieldAlert, History, Columns, Play, Ban, RefreshCcw
} from 'lucide-react';
import { SUPPORTED_FIELDS, getFieldMeta } from '../../../engine/FieldEngine/FieldEngine';
import { Card, CardHeader, CardContent } from '../../cards/Card';
import { Button } from '../../components/Button';
import { templateService, assetService, auditService } from '../../../services/db';
import { useAuth } from '../../../context/AuthContext';

// Decoupled Engines
import { presetStorage } from '../../../engine/StudioEngine/PresetStorageAdapter';
import { clipboardManager } from '../../../engine/StudioEngine/ClipboardEngine';
import HistoryEngine from '../../../engine/StudioEngine/HistoryEngine';
import SelectionEngine from '../../../engine/StudioEngine/SelectionEngine';
import { ImageProcessor } from '../../../engine/StudioEngine/ImageProcessor';
import { backgroundQueue } from '../../../engine/StudioEngine/BackgroundQueue';
import { ExportEngine } from '../../../engine/StudioEngine/ExportEngine';
import { diagnosticsStore } from '../../../utils/diagnosticsStore';


const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * OFFICIAL_PRESET_BLOCKS — Dynamic Binding System
 * Fields use bindingKey instead of hardcoded textContent.
 * At render time, the value is resolved from system-settings[bindingKey].
 * NO text is frozen inside the template — all identity fields are live.
 */
const OFFICIAL_PRESET_BLOCKS = [
    {
        id: 'appreciation_block',
        label: 'نص الشكر والتقدير الرسمي',
        description: 'عنوان الشهادة + نص التكريم + النص الختامي — ديناميكي من الإعدادات',
        fields: [
            {
                fieldId: 'certificate_title',
                x: 50, y: 22,
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
                textContent: 'شهادة شكر وتقدير' // user-defined per template — not bound
            },
            {
                fieldId: 'certificate_header_text',
                x: 50, y: 34,
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
                bindingKey: 'certificate_header_text' // ← reads from system-settings
            },
            {
                fieldId: 'recipient_name',
                x: 50, y: 44,
                fontSize: 38,
                color: '#000000',
                fontFamily: 'Cairo',
                align: 'center',
                width: 700,
                height: 50,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.6,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                fontWeight: 'bold'
            },
            {
                fieldId: 'reason',
                x: 50, y: 54,
                fontSize: 24,
                color: '#333333',
                fontFamily: 'Amiri',
                align: 'center',
                width: 800,
                height: 80,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.8,
                letterSpacing: 0,
                hidden: false,
                locked: false
            },
            {
                fieldId: 'certificate_closing_text',
                x: 50, y: 64,
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
                bindingKey: 'certificate_closing_text' // ← reads from system-settings
            }
        ]
    },
    {
        id: 'signature_block',
        label: 'بلوك التوقيع الرسمي المعتمد',
        description: 'توقيع المدير العام ديناميكياً مع الاسم واللقب الوظيفي — من الإعدادات',
        fields: [
            {
                fieldId: 'general_manager_signature',
                x: 80, y: 68,
                width: 160,
                height: 90,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false,
                bindingKey: 'general_manager_signature'
            },
            {
                fieldId: 'general_manager_name',
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
                bindingKey: 'general_manager_name'
            },
            {
                fieldId: 'general_manager_title',
                x: 80, y: 81,
                fontSize: 13,
                color: '#444444',
                fontFamily: 'Cairo',
                align: 'center',
                width: 280,
                height: 30,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.4,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                bindingKey: 'general_manager_title'
            }
        ]
    },
    {
        id: 'stamp_block',
        label: 'بلوك الختم الرسمي للوزارة',
        description: 'الختم الرسمي من إعدادات الهوية مباشرة',
        fields: [
            {
                fieldId: 'official_seal',
                x: 50, y: 70,
                width: 120,
                height: 120,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false,
                bindingKey: 'official_seal'
            }
        ]
    },
    {
        id: 'assistant_signature_block',
        label: 'بلوك مساعد المدير العام (التخطيط)',
        description: 'توقيع واسم ومسمى مساعد المدير العام للتخطيط والتحول — من الإعدادات',
        fields: [
            {
                fieldId: 'assistant_planning_signature',
                x: 20, y: 68,
                width: 130,
                height: 70,
                opacity: 1,
                rotation: 0,
                hidden: false,
                locked: false,
                bindingKey: 'assistant_planning_signature'
            },
            {
                fieldId: 'assistant_planning_name',
                x: 20, y: 76,
                fontSize: 16,
                color: '#000000',
                fontFamily: 'Cairo',
                align: 'center',
                width: 240,
                height: 30,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.4,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                bindingKey: 'assistant_planning_name'
            },
            {
                fieldId: 'assistant_planning_title',
                x: 20, y: 81,
                fontSize: 12,
                color: '#444444',
                fontFamily: 'Cairo',
                align: 'center',
                width: 260,
                height: 28,
                opacity: 1,
                rotation: 0,
                lineHeight: 1.4,
                letterSpacing: 0,
                hidden: false,
                locked: false,
                bindingKey: 'assistant_planning_title'
            }
        ]
    }
];

const historyEngine = new HistoryEngine(45);

export default function TemplateMapper() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, settings } = useAuth();

    const workspaceRef = useRef(null);
    const canvasRef = useRef(null);

    const [template, setTemplate] = useState(null);
    const [fields, setFields] = useState([]);

    // Page Navigator States (Multi-page document structure)
    const [currentPageIndex, setCurrentPageIndex] = useState(0);

    // Dialog & Overlays
    const [selectedIds, setSelectedIds] = useState([]);
    const [customPresets, setCustomPresets] = useState([]);
    const [assets, setAssets] = useState([]);
    const [showAssetManager, setShowAssetManager] = useState(false);
    const [showHistoryPanel, setShowHistoryPanel] = useState(false);
    const [showCompareDialog, setShowCompareDialog] = useState(false);
    const [compareTarget, setCompareTarget] = useState(null);

    // Active upload state variables
    const [uploadingAsset, setUploadingAsset] = useState(false);
    const [newAssetName, setNewAssetName] = useState('');
    const [newAssetCategory, setNewAssetCategory] = useState('LOGOS');
    const [newAssetCrop, setNewAssetCrop] = useState(false);

    // Visual queues list
    const [queueTasks, setQueueTasks] = useState([]);

    // UI Configuration
    const [zoom, setZoom] = useState(1.0);
    const [showGuides, setShowGuides] = useState(true);
    const [showRulers, setShowRulers] = useState(true);

    // Save & Error Pipeline States
    const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'saving', 'unsaved', 'error'
    const [saveError, setSaveError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Robust Telemetry & Hydration lifecycle states
    const [initStatus, setInitStatus] = useState('loading'); // 'loading' | 'failed' | 'recovered' | 'fallback-loaded' | 'ready'
    const [initErrorMsg, setInitErrorMsg] = useState('');

    // Layer Renaming
    const [renamingFieldUid, setRenamingFieldUid] = useState(null);
    const [renameValue, setRenameValue] = useState('');

    // Pointer Drag Coordinates
    const [isDragging, setIsDragging] = useState(false);

    // Performance Hardening: Refs to prevent render storms and event listener churn
    const fieldsRef = useRef(fields);
    const zoomRef = useRef(zoom);
    const selectedIdsRef = useRef(selectedIds);

    useEffect(() => { fieldsRef.current = fields; }, [fields]);
    useEffect(() => { zoomRef.current = zoom; }, [zoom]);
    useEffect(() => { selectedIdsRef.current = selectedIds; }, [selectedIds]);

    const dragData = useRef({
        active: false,
        fieldUid: null,
        startX: 0,
        startY: 0,
        initialFieldX: 0,
        initialFieldY: 0,
        moved: false
    });

    const dragStartPositions = useRef({});

    // Pointer Resize Coordinates
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

    // Magnet Snapping coordinates
    const [activeGuides, setActiveGuides] = useState({ x: null, y: null });

    // Custom Glassmorphic Context Menu coordinates
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, fieldUid: null });

    useEffect(() => {
        let active = true;
        const currentId = id;

        console.log(`[TRACING 🚀] route enter with id: ${currentId}`);
        setInitStatus('loading');
        setInitErrorMsg('');

        const initPipeline = async () => {
            console.log(`[TRACING ⚙️] starting initialization pipeline for template ID: ${currentId}`);

            let templateLoaded = false;
            let presetsLoaded = false;
            let assetsLoaded = false;

            // 1. Critical Phase: Load Template Design & Hydrate Fields
            try {
                if (!currentId) {
                    throw new Error("معرف القالب غير محدد بالرابط (Missing Route Param 'id')");
                }

                console.log(`[TRACING ⏳] phase 1: loading template [ID: ${currentId}]`);
                const found = await templateService.getById(currentId);

                if (!active) {
                    console.log(`[TRACING 🛑] template resolved but aborted because route or page index changed.`);
                    return;
                }

                if (found) {
                    if (!found.orientation) {
                        found.orientation = 'portrait';
                    }
                    console.log(`[TRACING 🧬] template resolved successfully: "${found.name}" [version: v${found.version || 1}]`);
                    setTemplate(found);

                    console.log("[TRACING 💧] hydration started: mapping fields structure");
                    const loadedPages = found?.pages ?? [{ pageNum: 1, fields: found?.fields ?? [], backgroundUrl: found?.backgroundUrl ?? '' }];
                    const activePageFields = loadedPages[currentPageIndex]?.fields ?? [];
                    console.log(`[TRACING 📜] template pages count: ${loadedPages.length}, current page index: ${currentPageIndex}`);

                    const mappedFields = (activePageFields ?? []).filter(Boolean).map(f => {
                        if (!f) return null;
                        return {
                            ...f,
                            _uid: f._uid || `uid_${Math.random().toString(36).substr(2, 9)}`,
                            hidden: f.hidden || false,
                            locked: f.locked || false,
                            lineHeight: f.lineHeight || 1.6,
                            letterSpacing: f.letterSpacing || 0,
                            aspectRatioLocked: f.aspectRatioLocked || false
                        };
                    }).filter(Boolean);

                    const finalFields = mappedFields ?? [];
                    setFields(finalFields);
                    historyEngine.initialize(finalFields);
                    setHasUnsavedChanges(false);
                    setSaveStatus('saved');
                    templateLoaded = true;
                    console.log(`[TRACING 🛡️] hydration complete: mapped ${mappedFields.length} fields successfully.`);
                } else {
                    console.warn(`[TRACING ⚠️] template resolved to null (not found in database registry) for ID: ${currentId}`);
                    diagnosticsStore.logInitializationError("TEMPLATE_NOT_FOUND", `القالب رقم ${currentId} غير موجود بقاعدة البيانات`, `ID: ${currentId}`);
                    setInitErrorMsg(`لم يتم العثور على القالب المطلوبة برقم: ${currentId} في قاعدة البيانات.`);
                    setInitStatus('failed');
                    return;
                }
            } catch (err) {
                console.error(`[TRACING 🚨] critical error in loadTemplate stage for ID: ${currentId}`, err);
                diagnosticsStore.logInitializationError("LOAD_TEMPLATE_FAILED", err, `ID: ${currentId}, PageIndex: ${currentPageIndex}`);
                setInitErrorMsg(`فشل تحميل القالب (Load Template Stage): ${err.message || err}`);
                setInitStatus('failed');
                return;
            }

            // 2. Non-Critical Phase: Load Custom Presets
            try {
                console.log(`[TRACING ⏳] phase 2: loading custom presets`);
                const custom = await presetStorage.getPresets();
                if (active) {
                    setCustomPresets(custom || []);
                    presetsLoaded = true;
                    console.log(`[TRACING 📦] custom presets loaded count: ${custom?.length || 0}`);
                }
            } catch (err) {
                console.error(`[TRACING ⚠️] non-critical failure: custom presets failed to load.`, err);
                diagnosticsStore.logInitializationError("LOAD_PRESETS_FAILED", err, `ID: ${currentId}`);
                // Proceed since it is non-critical
            }

            // 3. Non-Critical Phase: Load Shared Assets
            try {
                console.log(`[TRACING ⏳] phase 3: loading shared department assets`);
                const data = await assetService.getAll();
                if (active) {
                    const assetsList = data || [];
                    if (user?.role === 'CREATOR') {
                        setAssets(assetsList.filter(a => a.approved !== false));
                    } else {
                        setAssets(assetsList);
                    }
                    assetsLoaded = true;
                    console.log(`[TRACING 🖼️] shared assets loaded count: ${assetsList.length}`);
                }
            } catch (err) {
                console.error(`[TRACING ⚠️] non-critical failure: assets library failed to load.`, err);
                diagnosticsStore.logInitializationError("LOAD_ASSETS_FAILED", err, `ID: ${currentId}`);
                // Proceed since it is non-critical
            }

            // 4. Resolve final pipeline status cleanly and prevent silent freezes
            if (active) {
                if (templateLoaded) {
                    if (presetsLoaded && assetsLoaded) {
                        setInitStatus('ready');
                        console.log("[TRACING ✨] template studio initialized successfully in pristine state [status: ready]");
                    } else if (presetsLoaded || assetsLoaded) {
                        setInitStatus('recovered');
                        console.log("[TRACING ⚠️] template studio initialized with recovered state (minor non-critical errors caught) [status: recovered]");
                    } else {
                        setInitStatus('fallback-loaded');
                        console.log("[TRACING ⚠️] template studio initialized with fallback state (critical assets missing but template structure loaded) [status: fallback-loaded]");
                    }
                } else {
                    setInitStatus('failed');
                    console.log("[TRACING 🚨] template studio failed to initialize critical components [status: failed]");
                }
            }
        };

        initPipeline();

        return () => {
            console.log(`[TRACING 🛑] cleanup for route ID: ${currentId}`);
            active = false;
        };
    }, [id, currentPageIndex]);

    useEffect(() => {
        if (canvasRef.current) {
            console.log("[TRACING 🎨] canvas mounted");
        }
    }, [template]);

    useEffect(() => {
        if (template) {
            console.log("[TRACING ⚡] render complete");
        }
    }, [fields, zoom]);

    // Background tasks queue subscription
    useEffect(() => {
        const unsubscribe = backgroundQueue.subscribe((tasks) => {
            setQueueTasks(tasks);
        });
        return () => unsubscribe();
    }, []);

    const loadTemplate = async () => {
        console.log("[TRACING ⏳] manual template fetch triggered for id:", id);
        try {
            const found = await templateService.getById(id);
            if (found) {
                if (!found.orientation) {
                    found.orientation = 'portrait';
                }
                console.log(`[TRACING 🧬] template resolved: ${found.name}`);
                setTemplate(found);

                const loadedPages = found?.pages ?? [{ pageNum: 1, fields: found?.fields ?? [], backgroundUrl: found?.backgroundUrl ?? '' }];
                const activePageFields = loadedPages[currentPageIndex]?.fields ?? [];
                const mappedFields = (activePageFields ?? []).filter(Boolean).map(f => {
                    if (!f) return null;
                    return {
                        ...f,
                        _uid: f._uid || `uid_${Math.random().toString(36).substr(2, 9)}`,
                        hidden: f.hidden || false,
                        locked: f.locked || false,
                        lineHeight: f.lineHeight || 1.6,
                        letterSpacing: f.letterSpacing || 0,
                        aspectRatioLocked: f.aspectRatioLocked || false
                    };
                }).filter(Boolean);

                const finalFields = mappedFields ?? [];
                setFields(finalFields);
                historyEngine.initialize(finalFields);
                setHasUnsavedChanges(false);
                setSaveStatus('saved');
            }
        } catch (e) {
            console.error("[TRACING 🚨] manual template load failed: ", e);
            diagnosticsStore.logInitializationError("MANUAL_LOAD_TEMPLATE_FAILED", e, `ID: ${id}`);
            throw e;
        }
    };

    const loadCustomPresets = async () => {
        try {
            const custom = await presetStorage.getPresets();
            setCustomPresets(custom || []);
        } catch (e) {
            console.error("[TRACING ⚠️] failed to load custom presets:", e);
            diagnosticsStore.logInitializationError("MANUAL_LOAD_PRESETS_FAILED", e, `ID: ${id}`);
        }
    };

    const loadAssets = async () => {
        try {
            const data = await assetService.getAll();
            const assetsList = data || [];
            if (user?.role === 'CREATOR') {
                setAssets(assetsList.filter(a => a.approved !== false));
            } else {
                setAssets(assetsList);
            }
        } catch (e) {
            console.error("[TRACING ⚠️] failed to load assets:", e);
            diagnosticsStore.logInitializationError("MANUAL_LOAD_ASSETS_FAILED", e, `ID: ${id}`);
        }
    };

    const handleSave = async (showToast = true, changelogDesc = 'تحديث تلقائي للاستوديو') => {
        if (isSaving || !template) return;

        const startTimer = performance.now();
        setIsSaving(true);
        setSaveStatus('saving');
        setSaveError(null);
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Sync current active page fields back into template pages array
            const pages = template?.pages || [{ pageNum: 1, fields: [], backgroundUrl: template?.backgroundUrl || '' }];
            pages[currentPageIndex] = {
                pageNum: currentPageIndex + 1,
                fields: deepClone(fields),
                backgroundUrl: template?.backgroundUrl || ''
            };

            const payload = {
                ...template,
                fields: deepClone(fields), // legacy fallback
                backgroundUrl: template?.backgroundUrl || '',
                pages: pages,
                changelog: changelogDesc
            };

            // Cross-tab conflict protection:
            const latestTemplate = await templateService.getById(id);
            if (latestTemplate && latestTemplate.version > template?.version) {
                const overwrite = window.confirm(
                    `⚠️ تنبيه تعارض الحفظ المتقاطع:\n\n` +
                    `قام تبويب آخر (أو مستخدم آخر) بحفظ نسخة أحدث (v${latestTemplate.version}) من هذا القالب في الخلفية.\n` +
                    `إذا قمت بالحفظ الآن، ستكتب فوق تعديلاته وتلغيها.\n\n` +
                    `هل تريد فرض الحفظ والكتابة فوق التعديلات الأحدث على أي حال؟`
                );
                if (!overwrite) {
                    setSaveStatus('unsaved');
                    setIsSaving(false);
                    diagnosticsStore.logAutosave(0, 'collision_aborted', 0, true);
                    return;
                }
            }

            const updated = await templateService.update(id, payload);
            if (updated) {
                setTemplate(updated);
                setHasUnsavedChanges(false);
                setSaveStatus('saved');
                if (showToast) alert('تم حفظ ونشر الإصدار الجديد لقالب التصميم بنجاح.');

                const elapsed = Math.round(performance.now() - startTimer);
                diagnosticsStore.logAutosave(elapsed, 'success', 1, false);
            }
        } catch (e) {
            console.error(e);
            setSaveStatus('error');
            setSaveError(e.message);
            if (showToast) alert('فشل التخزين: ' + e.message);

            const elapsed = Math.round(performance.now() - startTimer);
            diagnosticsStore.logAutosave(elapsed, 'failed', 0, false);
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save triggers
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const timer = setTimeout(() => {
            handleSave(false, 'حفظ تلقائي للمسودة في الخلفية');
        }, 12000);
        return () => clearTimeout(timer);
    }, [fields, template, hasUnsavedChanges]);

    // Rollback template version
    const handleRollback = async (targetVer) => {
        if (!window.confirm(`هل أنت متأكد من استعادة وتراجع القالب للإصدار التاريخي v${targetVer}؟`)) return;
        try {
            const restored = await templateService.rollback(id, targetVer);
            if (restored) {
                alert("تم استعادة الإصدار السابق بنجاح!");
                setShowHistoryPanel(false);
                loadTemplate();
            }
        } catch (e) {
            alert("فشل التراجع: " + e.message);
        }
    };

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
            historyEngine.push(newFields);
        }
    };

    const handleUndo = () => {
        const prev = historyEngine.undo();
        if (prev) {
            setFields(prev);
            setHasUnsavedChanges(true);
            setSaveStatus('unsaved');
        }
    };

    const handleRedo = () => {
        const next = historyEngine.redo();
        if (next) {
            setFields(next);
            setHasUnsavedChanges(true);
            setSaveStatus('unsaved');
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
            aspectRatioLocked: false,
            textContent: meta.defaultContent || ''
        };

        const updated = [newField, ...fields];
        markDirty(updated);
        setSelectedIds([newField._uid]);
    };

    const addPresetBlock = (blockId) => {
        const block = OFFICIAL_PRESET_BLOCKS.find(b => b.id === blockId);
        if (!block) return;

        const newFields = block.fields.map(f => {
            const meta = getFieldMeta(f.fieldId);
            return {
                _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
                fieldId: f.fieldId,
                x: f.x ?? 50,
                y: f.y ?? 50,
                fontSize: f.fontSize ?? (meta?.defaultFontSize || 24),
                color: f.color ?? (meta?.defaultColor || '#000000'),
                fontFamily: f.fontFamily ?? (meta?.defaultFontFamily || 'Cairo'),
                align: f.align ?? 'center',
                width: f.width ?? (meta?.defaultWidth || 200),
                height: f.height ?? (meta?.defaultHeight || 60),
                opacity: f.opacity ?? 1,
                rotation: f.rotation ?? 0,
                lineHeight: f.lineHeight ?? 1.6,
                letterSpacing: f.letterSpacing ?? 0,
                hidden: f.hidden ?? false,
                locked: f.locked ?? false,
                aspectRatioLocked: f.aspectRatioLocked ?? false,
                // ── Dynamic Binding: preserve bindingKey from preset definition ──
                // bindingKey causes the field to read live from system-settings at render time.
                // Only set textContent if no bindingKey exists (user-defined fields).
                ...(f.bindingKey
                    ? { bindingKey: f.bindingKey }
                    : { textContent: f.textContent ?? (meta?.defaultContent || '') }
                )
            };
        });

        const updated = [...newFields, ...fields];
        markDirty(updated);
        setSelectedIds(newFields.map(n => n._uid));
    };

    const addCustomPresetBlock = (preset) => {
        if (!preset || !preset.fields) return;

        const newFields = preset.fields.map(f => {
            const meta = getFieldMeta(f.fieldId);
            return {
                _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
                fieldId: f.fieldId,
                x: f.x ?? 50,
                y: f.y ?? 50,
                fontSize: f.fontSize ?? (meta?.defaultFontSize || 24),
                color: f.color ?? (meta?.defaultColor || '#000000'),
                fontFamily: f.fontFamily ?? (meta?.defaultFontFamily || 'Cairo'),
                align: f.align ?? 'center',
                width: f.width ?? (meta?.defaultWidth || 200),
                height: f.height ?? (meta?.defaultHeight || 60),
                opacity: f.opacity ?? 1,
                rotation: f.rotation ?? 0,
                lineHeight: f.lineHeight ?? 1.6,
                letterSpacing: f.letterSpacing ?? 0,
                hidden: f.hidden ?? false,
                // Preserve bindingKey from saved custom presets
                ...(f.bindingKey ? { bindingKey: f.bindingKey } : {}),
                locked: f.locked ?? false,
                aspectRatioLocked: f.aspectRatioLocked ?? false,
                textContent: f.textContent ?? (meta?.defaultContent || '')
            };
        });

        const updated = [...newFields, ...fields];
        markDirty(updated);
        setSelectedIds(newFields.map(n => n._uid));
    };

    const handleSaveAsCustomPreset = async () => {
        if (selectedIds.length === 0) return alert('الرجاء اختيار عنصر واحد على الأقل لحفظه كمكون مخصص');

        const label = window.prompt('الرجاء إدخال اسم المكون المخصص الجديد:');
        if (!label) return;

        try {
            const selectedFields = fields.filter(f => selectedIds.includes(f._uid));
            const newPreset = {
                id: `preset_${Date.now()}`,
                label: label,
                description: `مكون مخصص يحتوي على عدد ${selectedFields.length} من الحقول المصممة`,
                fields: deepClone(selectedFields)
            };

            await presetStorage.savePreset(newPreset);
            alert('تم حفظ المكون المخصص بنجاح في أرشيف الاستوديو!');
            loadCustomPresets();
        } catch (e) {
            alert('فشل حفظ المكون المخصص: ' + e.message);
        }
    };

    const handleDeleteCustomPreset = async (e, presetId) => {
        e.stopPropagation();
        if (!window.confirm('هل أنت متأكد من حذف هذا المكون المخصص؟')) return;
        try {
            await presetStorage.deletePreset(presetId);
            alert('تم حذف المكون المخصص بنجاح.');
            loadCustomPresets();
        } catch (err) {
            alert('فشل حذف المكون المخصص: ' + err.message);
        }
    };

    const handleBackgroundUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Data = reader.result;
            setTemplate(p => {
                if (!p) return null;
                return {
                    ...p,
                    background: base64Data,
                    backgroundUrl: base64Data
                };
            });
            setHasUnsavedChanges(true);
            setSaveStatus('unsaved');
            alert('تم تحميل الخلفية بنجاح! سيتم حفظ التعديلات.');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveBackground = () => {
        if (!window.confirm('هل أنت متأكد من إزالة صورة الخلفية؟')) return;
        setTemplate(p => {
            if (!p) return null;
            return {
                ...p,
                background: '',
                backgroundUrl: ''
            };
        });
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
    };

    const handleToggleBackgroundLock = () => {
        setTemplate(p => {
            if (!p) return null;
            const currentLock = p.backgroundLocked !== false;
            return {
                ...p,
                backgroundLocked: !currentLock
            };
        });
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
    };

    // Asset governance upload manager with Canvas Compression & Cropper
    const handleAssetUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !newAssetName) return alert('الرجاء إدخال اسم الأصل الفني وتحديد الملف');

        setUploadingAsset(true);
        try {
            // Apply ImageProcessor canvas pipeline (compression, resizing, oval cropping for stamps)
            const result = await ImageProcessor.processImage(file, {
                cropCircle: newAssetCrop || newAssetCategory === 'STAMPS',
                maxWidth: newAssetCategory === 'STAMPS' ? 300 : 500,
                maxHeight: newAssetCategory === 'STAMPS' ? 300 : 500,
                quality: 0.8
            });

            const assetPayload = {
                name: newAssetName,
                category: newAssetCategory,
                url: result.optimizedBase64,
                department: user?.department || 'الإدارة العامة للتحول الرقمي',
                uploadedBy: user?.name || 'مكتب أصول الإدارة',
                sizeBytes: result.sizeBytes
            };

            await assetService.create(assetPayload);
            alert(`تم ضغط ومعالجة الملف بنجاح (${Math.round(result.sizeBytes / 1024)}KB) وحفظه بالأرشيف.`);
            setNewAssetName('');
            loadAssets();
        } catch (err) {
            alert('فشل معالجة الأصل الفني: ' + err.message);
        } finally {
            setUploadingAsset(false);
        }
    };

    // Enqueue offscreen background pdf rendering task
    const triggerBackgroundExport = () => {
        // Prevent duplicate enqueues
        const activeTasks = backgroundQueue.getTasks().filter(t => t.status === 'pending' || t.status === 'running');
        const isAlreadyQueued = activeTasks.some(t => t.label.includes(template.name));
        if (isAlreadyQueued) {
            alert('يوجد عملية تصدير قيد التشغيل بالفعل لهذا القالب في الخلفية.');
            return;
        }

        const taskId = `task_${Date.now()}`;
        const label = `تصدير وثيقة - ${template.name}`;

        backgroundQueue.enqueue(taskId, label, async (updateProgress) => {
            updateProgress(15);

            const dummyDataContext = {
                recipient_name: 'ياسر بن سلمان المطيري',
                certificate_title: 'شهادة شكر وتقدير',
                reason: 'لمشاركتكم المتميزة في نجاح مبادرة التحول الرقمي وحوكمة البيانات لوزارة الصحة.',
                date: new Date().toLocaleDateString('ar-SA'),
                serial_number: '202600888',
                qr_code: `CERT:202600888|ياسر بن سلمان المطيري`
            };

            await ExportEngine.exportHeadless(
                template,
                dummyDataContext,
                settings,
                {
                    filename: `تصدير_خلفي_${template.name}.pdf`,
                    format: 'pdf',
                    progressCallback: (p) => updateProgress(p)
                }
            );
        });
    };

    // Multi-page layout navigations
    const addNewPage = () => {
        if (!template) return;
        const pages = template?.pages || [{ pageNum: 1, fields: deepClone(fields), backgroundUrl: template?.backgroundUrl || '' }];
        const newPage = {
            pageNum: pages.length + 1,
            fields: [],
            backgroundUrl: template?.backgroundUrl || ''
        };
        const updated = [...pages, newPage];
        setTemplate(p => ({ ...p, pages: updated }));
        setCurrentPageIndex(updated.length - 1);
        setFields([]);
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
    };

    const duplicateCurrentPage = () => {
        if (!template) return;
        const pages = template?.pages || [{ pageNum: 1, fields: deepClone(fields), backgroundUrl: template?.backgroundUrl || '' }];
        const newPage = {
            pageNum: pages.length + 1,
            fields: deepClone(fields),
            backgroundUrl: template?.backgroundUrl || ''
        };
        const updated = [...pages, newPage];
        setTemplate(p => ({ ...p, pages: updated }));
        setCurrentPageIndex(updated.length - 1);
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
    };

    const deleteCurrentPage = () => {
        if (!template) return;
        const pages = template?.pages || [{ pageNum: 1, fields: deepClone(fields), backgroundUrl: template?.backgroundUrl || '' }];
        if (pages.length <= 1) return alert('يجب أن يحتوي القالب على صفحة واحدة على الأقل');
        if (!confirm('هل أنت متأكد من حذف الصفحة الحالية بالكامل؟')) return;

        const filtered = pages.filter((_, idx) => idx !== currentPageIndex).map((p, i) => ({ ...p, pageNum: i + 1 }));
        setTemplate(p => ({ ...p, pages: filtered }));
        setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
        setFields(filtered[Math.max(0, currentPageIndex - 1)]?.fields || []);
        setHasUnsavedChanges(true);
        setSaveStatus('unsaved');
    };

    const updateField = (uid, changes) => {
        const updated = fields.map(f => f._uid === uid ? { ...f, ...changes } : f);
        markDirty(updated, true);
    };

    const removeField = (uid) => {
        const updated = fields.filter(f => f._uid !== uid);
        markDirty(updated);
        setSelectedIds(selectedIds.filter(id => id !== uid));
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
        setSelectedIds([newField._uid]);
    };

    // Collective Spacing Spanning
    const distributeCollectiveSpacing = (direction) => {
        if (selectedIds.length < 3) return;
        const updated = SelectionEngine.distributeSpacing(fields, selectedIds, direction);
        markDirty(updated);
    };

    // Depth Arrangement tools
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

    const alignField = (uid, alignment) => {
        const field = fields.find(f => f._uid === uid);
        if (!field) return;

        const canvasW = template?.orientation === 'portrait' ? 793.7 : 1122.5;
        const canvasH = template?.orientation === 'portrait' ? 1122.5 : 793.7;
        const wPct = ((field.width || 200) / canvasW) * 100;
        const hPct = ((field.height || 60) / canvasH) * 100;

        let changes = {};
        if (alignment === 'left') changes.x = Math.round((10 + wPct / 2) * 10) / 10;
        else if (alignment === 'right') changes.x = Math.round((90 - wPct / 2) * 10) / 10;
        else if (alignment === 'centerX') changes.x = 50;
        else if (alignment === 'top') changes.y = Math.round((10 + hPct / 2) * 10) / 10;
        else if (alignment === 'bottom') changes.y = Math.round((90 - hPct / 2) * 10) / 10;
        else if (alignment === 'centerY') changes.y = 50;

        updateField(uid, changes);
        historyEngine.push(fields.map(f => f._uid === uid ? { ...f, ...changes } : f));
    };

    const startRenaming = (field) => {
        setRenamingFieldUid(field._uid);
        setRenameValue(getFieldMeta(field.fieldId)?.label || field.fieldId);
    };

    const saveRename = (uid) => {
        setRenamingFieldUid(null);
    };

    // Global Key Events Interceptor
    useEffect(() => {
        const handleKeyDown = (e) => {
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
                handleUndo();
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y: Redo
            if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
                e.preventDefault();
                handleRedo();
                return;
            }

            // Ctrl+A: Select All
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                setSelectedIds(fields.map(f => f._uid));
                return;
            }

            // Ctrl+C: Copy Elements
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                if (selectedIds.length > 0) {
                    const selected = fields.filter(f => selectedIds.includes(f._uid));
                    clipboardManager.copy(selected);
                }
                return;
            }

            // Ctrl+V: Paste Elements
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
                e.preventDefault();
                clipboardManager.paste().then(payload => {
                    if (payload && payload.elements) {
                        const pasted = payload.elements.map(el => ({
                            ...el,
                            _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
                            x: Math.min(95, el.x + 3),
                            y: Math.min(95, el.y + 3)
                        }));
                        const updated = [...pasted, ...fields];
                        markDirty(updated);
                        setSelectedIds(pasted.map(p => p._uid));
                    }
                });
                return;
            }

            // Escape: Deselect
            if (e.key === 'Escape') {
                e.preventDefault();
                setSelectedIds([]);
                return;
            }

            if (selectedIds.length === 0) return;

            // Delete / Backspace: Remove selected
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                let updated = [...fields];
                selectedIds.forEach(id => {
                    updated = updated.filter(f => f._uid !== id);
                });
                markDirty(updated);
                setSelectedIds([]);
                return;
            }

            // Ctrl+D: Duplicate elements
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                const newFields = [];
                fields.forEach(f => {
                    if (selectedIds.includes(f._uid)) {
                        newFields.push({
                            ...deepClone(f),
                            _uid: `uid_${Math.random().toString(36).substr(2, 9)}`,
                            x: Math.min(95, f.x + 3),
                            y: Math.min(95, f.y + 3)
                        });
                    }
                });
                if (newFields.length > 0) {
                    const updated = [...newFields, ...fields];
                    markDirty(updated);
                    setSelectedIds(newFields.map(n => n._uid));
                }
                return;
            }

            // Arrow Keys Collective Nudging
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                e.preventDefault();
                const step = e.shiftKey ? 1.0 : 0.1;
                let dx = 0;
                let dy = 0;

                if (e.key === 'ArrowLeft') dx = -step;
                if (e.key === 'ArrowRight') dx = step;
                if (e.key === 'ArrowUp') dy = -step;
                if (e.key === 'ArrowDown') dy = step;

                const updated = fields.map(f => {
                    if (selectedIds.includes(f._uid) && !f.locked) {
                        const newX = Math.max(0, Math.min(100, Math.round((f.x + dx) * 10) / 10));
                        const newY = Math.max(0, Math.min(100, Math.round((f.y + dy) * 10) / 10));
                        return { ...f, x: newX, y: newY };
                    }
                    return f;
                });
                markDirty(updated);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, fields, customPresets]);

    // Close right-click context menu automatically
    useEffect(() => {
        const closeMenu = () => {
            if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false });
        };
        window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [contextMenu]);

    // --- PERFORMANCE EVENT HARDENING LIFE-CYCLE --- //
    const startInteraction = () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);
        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
    };

    // --- INTERACTION: Drag & Multi-drag --- //
    const handlePointerDown = (e, field) => {
        if (field.locked) return;
        e.preventDefault();

        let currentSelection = [...selectedIdsRef.current];
        if (e.shiftKey) {
            if (currentSelection.includes(field._uid)) {
                currentSelection = currentSelection.filter(id => id !== field._uid);
            } else {
                currentSelection.push(field._uid);
            }
            setSelectedIds(currentSelection);
        } else {
            if (!currentSelection.includes(field._uid)) {
                setSelectedIds([field._uid]);
                currentSelection = [field._uid];
            }
        }

        let activeFieldUid = field._uid;
        if (e.altKey) {
            const newUid = `uid_${Math.random().toString(36).substr(2, 9)}`;
            const newField = {
                ...deepClone(field),
                _uid: newUid,
                x: field.x + 2.0,
                y: field.y + 2.0
            };
            const updated = [newField, ...fieldsRef.current];
            setFields(updated);
            activeFieldUid = newUid;
            setSelectedIds([newUid]);
            currentSelection = [newUid];
        }

        const startPositions = {};
        fieldsRef.current.forEach(f => {
            startPositions[f._uid] = { x: f.x, y: f.y };
        });
        dragStartPositions.current = startPositions;

        dragData.current = {
            active: true,
            fieldUid: activeFieldUid,
            startX: e.clientX,
            startY: e.clientY,
            initialFieldX: e.altKey ? field.x + 2.0 : field.x,
            initialFieldY: e.altKey ? field.y + 2.0 : field.y,
            moved: false
        };

        startInteraction();
    };

    // --- INTERACTION: Zoom-aware Resizing --- //
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
        startInteraction();
    };

    const handleGlobalPointerMove = (e) => {
        // A. RESIZING TRACKER
        if (resizeData.current.active) {
            const data = resizeData.current;
            const targetField = fields.find(x => x._uid === data.fieldUid);
            if (!targetField) return;

            const dx = e.clientX - data.startX;
            const dy = e.clientY - data.startY;

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

            if (targetField.aspectRatioLocked || e.shiftKey) {
                const initialRatio = data.initialWidth / data.initialHeight;
                if (handle.includes('r') || handle.includes('l')) {
                    newHeight = Math.round(newWidth / initialRatio);
                } else {
                    newWidth = Math.round(newHeight * initialRatio);
                }
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

        if (!dragData.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) {
            return;
        }

        if (!dragData.current.moved) {
            dragData.current.moved = true;
            setIsDragging(true);
        }

        const rect = canvasRef.current.getBoundingClientRect();
        const xPctDelta = (dx / rect.width) * 100;
        const yPctDelta = (dy / rect.height) * 100;

        if (selectedIds.length > 1 && selectedIds.includes(dragData.current.fieldUid)) {
            const updated = fields.map(f => {
                if (selectedIds.includes(f._uid) && !f.locked) {
                    const startPos = dragStartPositions.current[f._uid];
                    if (startPos) {
                        let nx = startPos.x + xPctDelta;
                        let ny = startPos.y + yPctDelta;
                        nx = Math.max(0, Math.min(100, Math.round(nx * 10) / 10));
                        ny = Math.max(0, Math.min(100, Math.round(ny * 10) / 10));
                        return { ...f, x: nx, y: ny };
                    }
                }
                return f;
            });
            setFields(updated);
        } else {
            let newX = dragData.current.initialFieldX + xPctDelta;
            let newY = dragData.current.initialFieldY + yPctDelta;

            let guideX = null;
            let guideY = null;
            const snapThreshold = 1.0;

            // Center Snapping
            if (Math.abs(newX - 50) < snapThreshold) { newX = 50; guideX = 50; }
            if (Math.abs(newY - 50) < snapThreshold) { newY = 50; guideY = 50; }

            // Safe Margins Snap
            if (Math.abs(newX - 5) < snapThreshold) { newX = 5; guideX = 5; }
            else if (Math.abs(newX - 95) < snapThreshold) { newX = 95; guideX = 95; }
            if (Math.abs(newY - 5) < snapThreshold) { newY = 5; guideY = 5; }
            else if (Math.abs(newY - 95) < snapThreshold) { newY = 95; guideY = 95; }

            fields.forEach(other => {
                if (other._uid === dragData.current.fieldUid || other.hidden) return;
                if (Math.abs(newX - other.x) < snapThreshold) { newX = other.x; guideX = other.x; }
                if (Math.abs(newY - other.y) < snapThreshold) { newY = other.y; guideY = other.y; }
            });

            newX = Math.max(0, Math.min(100, newX));
            newY = Math.max(0, Math.min(100, newY));

            newX = Math.round(newX * 10) / 10;
            newY = Math.round(newY * 10) / 10;

            updateField(dragData.current.fieldUid, { x: newX, y: newY });
            setActiveGuides({ x: guideX, y: guideY });
        }
    };

    const handleGlobalPointerUp = () => {
        window.removeEventListener('pointermove', handleGlobalPointerMove);
        window.removeEventListener('pointerup', handleGlobalPointerUp);
        window.removeEventListener('pointercancel', handleGlobalPointerUp);

        if (dragData.current.active) {
            dragData.current.active = false;
            setIsDragging(false);
            setActiveGuides({ x: null, y: null });
            historyEngine.push(fieldsRef.current);
        }

        if (resizeData.current.active) {
            resizeData.current.active = false;
            setIsResizing(false);
            historyEngine.push(fieldsRef.current);
        }
    };


    // Tab closed/refresh data loss protection (beforeunload interceptor)
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                const msg = "تنبيه: لديك تعديلات غير محفوظة على هذا القالب. هل تريد مغادرة الصفحة بالفعل؟";
                e.returnValue = msg;
                return msg;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Touch dragging & gesture scroll conflict preventions on mobile/tablets
    useEffect(() => {
        if (!template) return;
        const preventCanvasScroll = (e) => {
            if (isDragging || isResizing) {
                if (e.cancelable) e.preventDefault();
            }
        };
        const preventGestureZoom = (e) => {
            if (e.cancelable) e.preventDefault();
        };
        const canvasEl = canvasRef.current;
        if (!canvasEl) return;

        canvasEl.addEventListener('touchstart', preventCanvasScroll, { passive: false });
        canvasEl.addEventListener('touchmove', preventCanvasScroll, { passive: false });
        canvasEl.addEventListener('wheel', preventCanvasScroll, { passive: false });
        canvasEl.addEventListener('gesturestart', preventGestureZoom, { passive: false });

        return () => {
            canvasEl.removeEventListener('touchstart', preventCanvasScroll);
            canvasEl.removeEventListener('touchmove', preventCanvasScroll);
            canvasEl.removeEventListener('wheel', preventCanvasScroll);
            canvasEl.removeEventListener('gesturestart', preventGestureZoom);
        };
    }, [isDragging, isResizing, template]);

    // Regression Protection Debugging Logging
    console.debug('[HOOK-CHECK]', {
        templateLoaded: !!template,
        pagesCount: template?.pages?.length ?? (template ? 1 : 0),
        fieldsCount: fields?.length ?? 0
    });

    if (initStatus === 'loading') {
        return (
            <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', fontFamily: 'Cairo' }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', border: '4px solid var(--border-default)', borderTopColor: 'var(--color-primary-500)', animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-secondary)' }}>تحميل استوديو القوالب وتفاصيل الهوية الرسمية...</p>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (initStatus === 'failed') {
        return (
            <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo', padding: '24px', direction: 'rtl' }}>
                <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px', padding: '32px', maxWidth: '480px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: 'var(--shadow-overlay)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-danger)' }}>
                        <ShieldAlert size={28} />
                        <h2 style={{ fontSize: '18px', fontWeight: 900, margin: 0 }}>فشل تهيئة استوديو التصميم</h2>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                        {initErrorMsg || 'حدث خطأ غير متوقع أثناء تحميل القالب أو أصول الهوية.'}
                    </p>

                    <div style={{ background: 'var(--bg-page)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 800, display: 'block', marginBottom: '4px', color: 'var(--color-danger)' }}>معلومات التتبع الفني للمشرف:</span>
                        <code style={{ wordBreak: 'break-all', fontFamily: 'monospace', lineHeight: 1.5 }}>
                            Template ID: {id || 'None'}<br />
                            Active Provider: local_offline_db
                        </code>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button style={{ flex: 1, padding: '10px', background: 'var(--color-danger)', color: '#fff', fontSize: '12px', fontWeight: 800, border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { setInitStatus('loading'); setInitErrorMsg(''); loadTemplate(); loadCustomPresets(); loadAssets(); }}>
                            إعادة المحاولة
                        </button>
                        <button style={{ flex: 1, padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 800, borderRadius: '8px', cursor: 'pointer' }} onClick={handleBack}>
                            العودة للرئيسية
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!template) return <div style={{ background: 'var(--bg-page)', color: 'var(--text-primary)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>تحميل المنصة الرسمية...</div>;

    const activeField = fields.find(f => selectedIds.includes(f._uid));
    const unifiedBox = SelectionEngine.getUnifiedBoundingBox(fields, selectedIds);
    const pagesList = template?.pages || [{ pageNum: 1, fields: fields, backgroundUrl: template?.backgroundUrl || '' }];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-page)', color: 'var(--text-primary)', overflow: 'hidden', fontFamily: 'Cairo', direction: 'rtl' }}>
            {(initStatus === 'recovered' || initStatus === 'fallback-loaded') && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                    borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '8px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    zIndex: 101,
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--color-warning)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertTriangle size={14} />
                        <span>
                            {initStatus === 'recovered'
                                ? '⚠️ وضع الاسترداد النشط: تم تجاوز بعض أخطاء تحميل الأصول الفرعية بنجاح لحفظ استقرار منصة التصميم.'
                                : '⚠️ وضع التشغيل الاحتياطي: فشل الاتصال بخوادم المكونات الإضافية وتثبيت المسودات بالكامل. تم تحميل القالب الرئيسي فقط لتفادي التعطل.'}
                        </span>
                    </div>
                    <button
                        onClick={() => setInitStatus('ready')}
                        style={{
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            color: 'var(--text-inverse)',
                            padding: '3px 10px',
                            borderRadius: '4px',
                            fontSize: '9px',
                            cursor: 'pointer',
                            fontWeight: 800,
                        }}
                    >
                        تجاهل التنبيه
                    </button>
                </div>
            )}

            {/* ─── 🏛️ TOP ACTION BAR ─── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '10px 24px', borderBottom: '1px solid var(--border-default)', zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={handleBack} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '11px' }}>
                        <ArrowLeft size={16} /> العودة للرئيسية
                    </button>

                    <div style={{ height: '20px', width: '1px', background: 'var(--border-default)' }} />

                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>{template.name}</h2>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>(الإصدار v{template.version || 1})</span>

                            {/* State indicators */}
                            {saveStatus === 'saved' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '2px 8px', borderRadius: '20px' }}>
                                    <CheckCircle size={10} /> محفوظ وآمن
                                </span>
                            )}
                            {saveStatus === 'saving' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-info)', background: 'var(--color-info-bg)', padding: '2px 8px', borderRadius: '20px', animation: 'pulse 1.2s infinite' }}>
                                    ⏳ جاري الحفظ...
                                </span>
                            )}
                            {saveStatus === 'unsaved' && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-warning)', background: 'var(--color-warning-bg)', padding: '2px 8px', borderRadius: '20px' }}>
                                    ● تعديل غير محفوظ
                                </span>
                            )}
                            {saveStatus === 'error' && (
                                <span onClick={() => handleSave(true)} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '2px 8px', borderRadius: '20px', cursor: 'pointer', border: '1px solid var(--border-default)' }}>
                                    <AlertTriangle size={10} /> خطأ! انقر للمحاولة
                                </span>
                            )}
                        </div>
                        <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 800 }}>Saudi Government Official Publishing Studio</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={() => setShowHistoryPanel(true)}
                        style={{ padding: '8px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <History size={14} /> الإصدارات التاريخية ({template.versionHistory?.length || 0})
                    </button>

                    <button
                        onClick={() => setShowAssetManager(true)}
                        style={{ padding: '8px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Settings size={14} /> سجل وحوكمة الأصول الرسمية
                    </button>

                    <button
                        onClick={triggerBackgroundExport}
                        style={{ padding: '8px 12px', background: 'var(--color-success-bg)', border: 'none', cursor: 'pointer', color: 'var(--color-success)', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                        <Play size={14} /> تصدير PDF خلفي
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-subtle)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                        <button onClick={handleUndo} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '6px' }}><Undo2 size={14} /></button>
                        <button onClick={handleRedo} style={{ padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: '6px' }}><Redo2 size={14} /></button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px', background: 'var(--bg-subtle)', padding: '2px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.1))} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomOut size={13} /></button>
                        <span style={{ fontSize: '11px', fontWeight: 800, minWidth: '40px', textAlign: 'center', color: 'var(--text-primary)' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(3.0, z + 0.1))} style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><ZoomIn size={13} /></button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="primary" onClick={() => handleSave(true, 'تحديث يدوي نهائي وتأكيد النشر')} disabled={isSaving} leftIcon={Save} style={{ fontSize: '11px', fontWeight: 800 }}>حفظ يدوي ونشر</Button>
                </div>
            </div>

            {/* ─── WORKSPACE PANELS ─── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* 👈 LEFT BAR: PRESETS & STANDARD FIELDS */}
                <div style={{ width: '310px', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>

                    {/* Collapsible layout controls */}
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '4px' }}><Columns size={12} /> محرر صفحات الوثيقة (Multi-page)</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                            <select value={currentPageIndex} onChange={e => { setCurrentPageIndex(Number(e.target.value)); setSelectedIds([]); }} style={{ padding: '8px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '8px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                                {(pagesList ?? []).map((p, i) => <option key={i} value={i}>صفحة {p.pageNum}</option>)}
                            </select>
                            <button onClick={addNewPage} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }} title="إضافة صفحة"><Plus size={14} /></button>
                            <button onClick={duplicateCurrentPage} style={{ padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }} title="تكرار الصفحة الحالية"><Copy size={14} /></button>
                            <button onClick={deleteCurrentPage} style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: 'var(--color-danger)', borderRadius: '8px', cursor: 'pointer' }} title="حذف الصفحة الحالية"><Trash2 size={14} /></button>
                        </div>
                    </div>

                    {/* Government preset design blocks */}
                    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '8px', color: 'var(--color-success)' }}><Sparkles size={14} /> كتل الهوية الرسمية (Presets)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {OFFICIAL_PRESET_BLOCKS.map(block => (
                                <button key={block.id} onClick={() => addPresetBlock(block.id)} style={{ display: 'flex', flexDirection: 'column', padding: '8px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', textAlign: 'right', width: '100%' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-primary)' }}>{block.label}</span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>{block.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Shared Custom components */}
                    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '8px', color: 'var(--color-warning)' }}><Clipboard size={14} /> مكونات الإدارة المشتركة</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                            {customPresets.map(preset => (
                                <div key={preset.id} onClick={() => addCustomPresetBlock(preset)} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>{preset.label}</span>
                                    <button onClick={(e) => handleDeleteCustomPreset(e, preset.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}><X size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Standard Fields Add */}
                    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '8px', color: 'var(--color-info)' }}><Plus size={14} /> إضافة حقول فردية</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                            {SUPPORTED_FIELDS.map(f => (
                                <button key={f.id} onClick={() => addField(f.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                                    {f.label.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* 🖼️ Template Background Management Section */}
                    <div style={{ padding: '14px', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-page)' }}>
                        <h3 style={{ fontSize: '12px', fontWeight: 900, marginBottom: '8px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ImageIcon size={14} /> خلفية قالب النشر
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {(template?.background || template?.backgroundUrl) ? (
                                <>
                                    <div style={{ position: 'relative', width: '100%', height: '80px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
                                        <img
                                            src={template.background || template.backgroundUrl}
                                            alt="Bg Preview"
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-strong)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'center' }}>
                                            استبدال
                                            <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleBackgroundUpload} style={{ display: 'none' }} />
                                        </label>
                                        <button
                                            onClick={handleRemoveBackground}
                                            style={{ flex: 1, padding: '6px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 800, color: 'var(--color-danger)' }}
                                        >
                                            إزالة
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleToggleBackgroundLock}
                                        style={{
                                            width: '100%',
                                            padding: '6px 10px',
                                            background: template.backgroundLocked !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: 800,
                                            color: template.backgroundLocked !== false ? 'var(--color-success)' : 'var(--color-warning)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        {template.backgroundLocked !== false ? (
                                            <>
                                                <Lock size={12} /> خلفية مقفلة (Pointer-events: none)
                                            </>
                                        ) : (
                                            <>
                                                <Unlock size={12} /> خلفية غير مقفلة
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', textAlign: 'right' }}>لا توجد صورة خلفية نشطة حالياً.</span>
                                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', background: 'var(--bg-subtle)', border: '1px dashed var(--border-strong)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>
                                        <Plus size={14} /> رفع صورة الخلفية
                                        <input type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleBackgroundUpload} style={{ display: 'none' }} />
                                    </label>
                                    <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', textAlign: 'right' }}>صيغ الدعم: PNG, JPG, JPEG, SVG</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Layers listing */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-tertiary)' }}>الطبقات (Layers)</span>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px', background: 'var(--bg-page)' }}>
                            {fields.map((f) => {
                                const meta = getFieldMeta(f.fieldId);
                                const isSelected = selectedIds.includes(f._uid);
                                const isRenaming = renamingFieldUid === f._uid;

                                return (
                                    <div
                                        key={f._uid}
                                        onClick={(e) => {
                                            if (e.shiftKey) {
                                                setSelectedIds(prev => prev.includes(f._uid) ? prev.filter(x => x !== f._uid) : [...prev, f._uid]);
                                            } else {
                                                setSelectedIds([f._uid]);
                                            }
                                        }}
                                        onDoubleClick={() => startRenaming(f)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '8px 12px',
                                            background: isSelected ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                                            color: isSelected ? 'var(--color-success)' : 'var(--text-primary)',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            gap: '8px',
                                            border: isSelected ? '1px solid var(--color-success)' : '1px solid var(--border-default)'
                                        }}
                                    >
                                        <div style={{ flex: 1, fontSize: '11px', fontWeight: 800 }}>
                                            {isRenaming ? (
                                                <input
                                                    value={renameValue}
                                                    onChange={e => setRenameValue(e.target.value)}
                                                    onBlur={() => saveRename(f._uid)}
                                                    onKeyDown={e => { if (e.key === 'Enter') saveRename(f._uid) }}
                                                    autoFocus
                                                    style={{ background: 'var(--bg-page)', border: '1px solid var(--color-success)', color: 'var(--text-primary)', padding: '2px 4px', fontSize: '10px', borderRadius: '4px', width: '90%' }}
                                                />
                                            ) : (
                                                f.customName || meta?.label || f.fieldId
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { hidden: !f.hidden }) }} style={{ background: 'none', border: 'none', color: 'inherit', opacity: f.hidden ? 0.3 : 0.8 }}><Eye size={12} /></button>
                                            <button onClick={(e) => { e.stopPropagation(); updateField(f._uid, { locked: !f.locked }) }} style={{ background: 'none', border: 'none', color: 'inherit', opacity: f.locked ? 0.8 : 0.3 }}>{f.locked ? <Lock size={12} /> : <Unlock size={12} />}</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 🎛️ CENTER BOARD: VIRTUAL RENDER CANVAS */}
                <div
                    ref={workspaceRef}
                    data-canvas-workspace="true"
                    style={{
                        flex: 1,
                        background: 'var(--bg-muted)',
                        overflowX: 'auto',
                        overflowY: 'auto',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        position: 'relative',
                        minHeight: 0,
                        paddingTop: showRulers ? '18px' : '40px',
                        paddingBottom: '80px',
                    }}
                    onClick={(e) => { if (e.target === workspaceRef.current || e.target.parentElement === workspaceRef.current) setSelectedIds([]) }}
                >
                    {/* A4 Metric Rulers */}
                    {showRulers && (
                        <>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '18px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)', zIndex: 9, pointerEvents: 'none', display: 'flex', alignItems: 'center', padding: '0 20px', fontSize: '9px', color: 'var(--text-tertiary)' }}>
                                <span>{template?.orientation === 'portrait' ? '0mm ─────────────── 100mm ─────────────── 210mm' : '0mm ─────────────────── 100mm ─────────────────── 200mm ─────────────────── 297mm'}</span>
                            </div>
                            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '18px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', zIndex: 9, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', fontSize: '9px', color: 'var(--text-tertiary)' }}>
                                <span style={{ writingMode: 'vertical-rl' }}>{template?.orientation === 'portrait' ? '0mm ─────────────────── 100mm ─────────────────── 200mm ─────────────────── 297mm' : '0mm ────── 100mm ────── 210mm'}</span>
                            </div>
                        </>
                    )}

                    <div
                        ref={canvasRef}
                        style={{
                            width: template?.orientation === 'portrait' ? '793.7px' : '1122.5px',
                            height: template?.orientation === 'portrait' ? '1122.5px' : '793.7px',
                            backgroundColor: '#ffffff',
                            position: 'relative',
                            boxShadow: 'var(--shadow-overlay)',
                            transform: `scale(${zoom})`,
                            transformOrigin: 'top center',
                            transition: (isDragging || isResizing) ? 'none' : 'transform 0.12s ease',
                            overflow: 'hidden',
                            flexShrink: 0,
                            marginLeft: showRulers ? '18px' : '0',
                            touchAction: 'none'
                        }}
                    >
                        {/* Background Layer (locked) */}
                        {(template?.background || template?.backgroundUrl) && (
                            <img
                                src={template.background || template.backgroundUrl}
                                alt="Template Background"
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    zIndex: 0,
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                        {/* Printable Area Safe limits */}
                        {showGuides && (
                            <>
                                <div style={{ position: 'absolute', top: '2%', left: '2%', right: '2%', bottom: '2%', border: '1px dashed rgba(239, 68, 68, 0.2)', pointerEvents: 'none', zIndex: 1 }} />
                                <div style={{ position: 'absolute', top: '5%', left: '5%', right: '5%', bottom: '5%', border: '1px dashed rgba(16, 185, 129, 0.3)', pointerEvents: 'none', zIndex: 1 }} />
                            </>
                        )}

                        {/* Snap axes */}
                        {activeGuides.y !== null && (
                            <div style={{ position: 'absolute', left: 0, right: 0, top: `${activeGuides.y}%`, height: '1px', borderTop: '1.5px dashed #ef4444', zIndex: 999, pointerEvents: 'none' }} />
                        )}
                        {activeGuides.x !== null && (
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${activeGuides.x}%`, width: '1px', borderLeft: '1.5px dashed #ef4444', zIndex: 999, pointerEvents: 'none' }} />
                        )}

                        {/* Multi selection Bounding box */}
                        {selectedIds.length > 1 && unifiedBox && (
                            <div style={{
                                position: 'absolute',
                                left: `${unifiedBox.minX}%`,
                                top: `${unifiedBox.minY}%`,
                                width: `${unifiedBox.width}%`,
                                height: `${unifiedBox.height}%`,
                                border: '1.5px dashed #10b981',
                                pointerEvents: 'none',
                                zIndex: 998
                            }} />
                        )}

                        {[...fields].reverse().map((f, reverseIdx) => {
                            if (f.hidden) return null;
                            const meta = getFieldMeta(f.fieldId);
                            const isSelected = selectedIds.includes(f._uid);
                            const zIndex = 10 + reverseIdx;

                            return (
                                <div
                                    key={f._uid}
                                    onPointerDown={(e) => handlePointerDown(e, f)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedIds([f._uid]);
                                        setContextMenu({ visible: true, x: e.clientX, y: e.clientY, fieldUid: f._uid });
                                    }}
                                    style={{
                                        position: 'absolute',
                                        left: `${f.x}%`,
                                        top: `${f.y}%`,
                                        transform: `translate(-50%, -50%) rotate(${f.rotation || 0}deg)`,
                                        zIndex: zIndex,
                                        opacity: f.opacity || 1,
                                        cursor: f.locked ? 'default' : (isDragging && isSelected ? 'grabbing' : 'grab'),
                                        border: isSelected ? '2px solid #0EA5E9' : '1px dashed rgba(0,0,0,0.06)',
                                        padding: meta?.type === 'text' || meta?.type === 'textarea' ? '0' : '4px',
                                        color: f.color || '#000',
                                        fontFamily: f.fontFamily || 'Cairo',
                                        fontSize: `${f.fontSize}px`,
                                        textAlign: f.align || 'center',
                                        whiteSpace: 'pre-wrap',
                                        lineHeight: f.lineHeight || 1.6,
                                        letterSpacing: `${f.letterSpacing || 0}px`,
                                        width: f.width ? `${f.width}px` : '100%',
                                        userSelect: 'none',
                                        touchAction: 'none'
                                    }}
                                >
                                    {meta?.type === 'text' || meta?.type === 'textarea' ? (
                                        <span style={{
                                            fontWeight: f.fontWeight || meta?.defaultWeight || 400,
                                            display: 'block',
                                            width: '100%',
                                        }}>
                                            {/* resolveFieldValue: live binding from system-settings when bindingKey is set */}
                                            {(() => {
                                                const resolved = resolveFieldValue(f, meta, {}, settings);
                                                if (resolved) return resolved;
                                                return f.bindingKey
                                                    ? <span style={{ color: '#f59e0b', fontStyle: 'italic', fontSize: '11px' }}>🔗 {`{{${f.bindingKey}}}`}</span>
                                                    : `[${meta?.label}]`;
                                            })()}
                                        </span>
                                    ) : (
                                        <div style={{ width: '100%', height: `${f.height}px`, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', fontSize: '11px', border: '1px dashed rgba(0,0,0,0.12)', flexDirection: 'column', gap: '4px' }}>
                                            <span>{meta?.label}</span>
                                            {f.bindingKey && <span style={{ fontSize: '9px', color: 'var(--color-primary-500)' }}>🔗 {f.bindingKey}</span>}
                                        </div>
                                    )}
                                    {/* 8-point scaling handles */}
                                    {isSelected && !f.locked && selectedIds.length === 1 && (
                                        <>
                                            {['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'].map(handle => {
                                                let style = {
                                                    position: 'absolute',
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#ffffff',
                                                    border: '2.5px solid #0ea5e9',
                                                    borderRadius: '2px',
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
                <div style={{ width: '330px', background: 'var(--bg-surface)', borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-default)' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: 'var(--text-primary)' }}>خصائص العناصر (Geometry)</span>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {selectedIds.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px' }}>

                                {/* Spacing distributions */}
                                {selectedIds.length > 2 && (
                                    <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                        <h4 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-warning)', marginBottom: '8px' }}>توزيع الفراغات بالتساوي</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            <button onClick={() => distributeCollectiveSpacing('horizontal')} style={{ padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-strong)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: 'var(--text-primary)' }}>توزيع أفقي</button>
                                            <button onClick={() => distributeCollectiveSpacing('vertical')} style={{ padding: '6px', background: 'var(--bg-muted)', border: '1px solid var(--border-strong)', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', color: 'var(--text-primary)' }}>توزيع عمودي</button>
                                        </div>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button onClick={handleSaveAsCustomPreset} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', borderRadius: '6px', color: 'var(--color-success)', fontSize: '10px', fontWeight: 900, cursor: 'pointer' }}>
                                        <Sparkles size={12} /> حفظ كمجموعه مخصصة
                                    </button>
                                </div>

                                {/* Collective alignments */}
                                <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                    <h4 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '8px' }}>محاذاة العناصر للـ Canvas</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'left'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>يسار</button>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'centerX'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>أفقي</button>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'right'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>يمين</button>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'top'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>أعلى</button>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'centerY'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>عمودي</button>
                                        <button onClick={() => selectedIds.forEach(id => alignField(id, 'bottom'))} style={{ padding: '4px', background: 'var(--bg-muted)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '9px', cursor: 'pointer' }}>أسفل</button>
                                    </div>
                                </div>

                                {activeField && (
                                    <>
                                        <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={activeField.aspectRatioLocked || false}
                                                    onChange={e => updateField(activeField._uid, { aspectRatioLocked: e.target.checked })}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                قفل نسبة الطول إلى العرض
                                            </label>
                                        </div>

                                        <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                            <h4 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '10px' }}>الأبعاد والموقع (Geometry)</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>X (%)
                                                    <input type="number" step="0.5" value={activeField.x} onChange={e => { updateField(activeField._uid, { x: Number(e.target.value) }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, x: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked} />
                                                </label>
                                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Y (%)
                                                    <input type="number" step="0.5" value={activeField.y} onChange={e => { updateField(activeField._uid, { y: Number(e.target.value) }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, y: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked} />
                                                </label>
                                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>العرض (px)
                                                    <input type="number" step="10" value={activeField.width || 0} onChange={e => { updateField(activeField._uid, { width: Number(e.target.value) }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, width: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked} />
                                                </label>
                                                <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>الارتفاع (px)
                                                    <input type="number" step="10" value={activeField.height || 0} onChange={e => { updateField(activeField._uid, { height: Number(e.target.value) }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, height: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked} />
                                                </label>
                                            </div>
                                        </div>

                                        {(getFieldMeta(activeField.fieldId)?.type === 'text' || getFieldMeta(activeField.fieldId)?.type === 'textarea') && (
                                            <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                                <h4 style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-secondary)', marginBottom: '10px' }}>النصوص والمحتوى (Typography)</h4>
                                                <textarea value={activeField.textContent || ''} onChange={e => { updateField(activeField._uid, { textContent: e.target.value }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, textContent: e.target.value } : f)); }} placeholder={`نص افتراضي...`} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', minHeight: '60px', resize: 'vertical' }} disabled={activeField.locked} />

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>حجم الخط
                                                        <input type="number" value={activeField.fontSize} onChange={e => { updateField(activeField._uid, { fontSize: Number(e.target.value) }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, fontSize: Number(e.target.value) } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked} />
                                                    </label>
                                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>اللون
                                                        <input type="color" value={activeField.color} onChange={e => { updateField(activeField._uid, { color: e.target.value }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, color: e.target.value } : f)); }} style={{ width: '100%', height: '30px', border: '1px solid var(--border-default)', borderRadius: '4px', marginTop: '4px', cursor: 'pointer', padding: 0 }} disabled={activeField.locked} />
                                                    </label>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', marginTop: '8px' }}>
                                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>الخط المعتمد
                                                        <select value={activeField.fontFamily || 'Cairo'} onChange={e => { updateField(activeField._uid, { fontFamily: e.target.value }); historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, fontFamily: e.target.value } : f)); }} style={{ width: '100%', padding: '6px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', borderRadius: '4px', color: 'var(--text-primary)', marginTop: '4px' }} disabled={activeField.locked}>
                                                            <option value="Cairo">Cairo (رسمي عصري)</option>
                                                            <option value="Amiri">Amiri (رسمي كلاسيكي)</option>
                                                            <option value="Tajawal">Tajawal</option>
                                                        </select>
                                                    </label>
                                                </div>

                                                {/* ── Font Weight Selector ── */}
                                                <div style={{ marginTop: '8px' }}>
                                                    <label style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>وزن الخط (Font Weight)</label>
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                                                        {[
                                                            { label: 'عادي', value: '400' },
                                                            { label: 'متوسط', value: '500' },
                                                            { label: 'شبه عريض', value: '600' },
                                                            { label: 'عريض', value: '700' },
                                                            { label: 'ثقيل', value: '800' },
                                                        ].map(({ label, value }) => {
                                                            const isActive = String(activeField.fontWeight || '400') === value;
                                                            return (
                                                                <button
                                                                    key={value}
                                                                    disabled={activeField.locked}
                                                                    onClick={() => {
                                                                        updateField(activeField._uid, { fontWeight: value });
                                                                        historyEngine.push(fields.map(f => f._uid === activeField._uid ? { ...f, fontWeight: value } : f));
                                                                    }}
                                                                    style={{
                                                                        padding: '5px 3px',
                                                                        background: isActive ? 'var(--color-primary-500)' : 'var(--bg-subtle)',
                                                                        border: isActive ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                                                                        borderRadius: '4px',
                                                                        color: isActive ? 'var(--text-inverse)' : 'var(--text-secondary)',
                                                                        fontSize: '9px',
                                                                        fontWeight: value,
                                                                        cursor: activeField.locked ? 'default' : 'pointer',
                                                                        textAlign: 'center',
                                                                        transition: 'all 0.12s',
                                                                        fontFamily: activeField.fontFamily || 'Cairo',
                                                                    }}
                                                                >
                                                                    {label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Button variant="outline" size="sm" onClick={() => selectedIds.forEach(id => duplicateField(id))} leftIcon={Copy} style={{ flex: 1, fontSize: '11px', fontWeight: 800 }}>تكرار</Button>
                                            <Button variant="outline" size="sm" onClick={() => selectedIds.forEach(id => removeField(id))} leftIcon={Trash2} style={{ flex: 1, fontSize: '11px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.2)', fontWeight: 800 }}>حذف</Button>
                                        </div>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '220px', color: 'var(--text-secondary)', textAlign: 'center', gap: '8px', padding: '24px' }}>
                                <MousePointer2 size={26} style={{ opacity: 0.4, color: 'var(--color-primary-500)' }} />
                                <span style={{ fontSize: '11px', fontWeight: 800 }}>حدد عنصراً أو عدة عناصر لتعديل أبعادها ومحاذاتها ومسافاتها بالتساوي.</span>
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
                        background: 'var(--bg-surface)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border-default)',
                        boxShadow: 'var(--shadow-floating)',
                        borderRadius: '10px',
                        padding: '6px',
                        zIndex: 9999,
                        minWidth: '170px',
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
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>تأمين القفل</span>
                        <Lock size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <button
                        onClick={() => {
                            const f = fields.find(x => x._uid === contextMenu.fieldUid);
                            if (f) updateField(f._uid, { hidden: !f.hidden });
                        }}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>إخفاء الطبقة</span>
                        <EyeOff size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <button
                        onClick={() => {
                            const f = fields.find(x => x._uid === contextMenu.fieldUid);
                            if (f) updateField(f._uid, { aspectRatioLocked: !f.aspectRatioLocked });
                        }}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>قفل النسبة المتزنة</span>
                        <Maximize size={12} style={{ opacity: 0.5 }} />
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-default)', margin: '4px 0' }} />
                    <button
                        onClick={() => bringToFront(contextMenu.fieldUid)}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        جلب للمقدمة
                    </button>
                    <button
                        onClick={() => sendToBack(contextMenu.fieldUid)}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 800, borderRadius: '6px' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        إرسال للخلف
                    </button>
                    <div style={{ height: '1px', background: 'var(--border-default)', margin: '4px 0' }} />
                    <button
                        onClick={() => removeField(contextMenu.fieldUid)}
                        style={{ padding: '8px 12px', background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '11px', fontWeight: 900, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        <span>حذف المكون</span>
                        <Trash2 size={12} />
                    </button>
                </div>
            )}

            {/* 🛡️ DIALOG 1: Asset Governance Manager */}
            {showAssetManager && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Cairo' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '16px', width: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary-500)' }}><Settings size={18} /> حوكمة وإدارة أصول الجهات الرسمية</h3>
                            <button onClick={() => setShowAssetManager(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={18} /></button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Upload New Asset Form */}
                            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-warning)', display: 'block', marginBottom: '8px' }}>+ إضافة وتسجيل أصل رسمي جديد معتمد</span>
                                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '10px', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        value={newAssetName}
                                        onChange={e => setNewAssetName(e.target.value)}
                                        placeholder="اسم الأصل (مثال: ختم التحول الرقمي الدائري)"
                                        style={{ background: 'var(--bg-page)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px', fontSize: '11px', borderRadius: '6px' }}
                                    />
                                    <select value={newAssetCategory} onChange={e => setNewAssetCategory(e.target.value)} style={{ background: 'var(--bg-page)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', padding: '8px', fontSize: '11px', borderRadius: '6px' }}>
                                        <option value="LOGOS">شعارات رسمية (Logos)</option>
                                        <option value="SIGNATURES">تواقيع المدراء (Signatures)</option>
                                        <option value="STAMPS">أختام الإدارات (Stamps)</option>
                                        <option value="FONTS">خطوط معتمدة (Fonts)</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={newAssetCrop} onChange={e => setNewAssetCrop(e.target.checked)} style={{ cursor: 'pointer' }} />
                                        قص واقتصاص ذكي (Crop Canvas)
                                    </label>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input type="file" onChange={handleAssetUpload} style={{ display: 'none' }} disabled={uploadingAsset} />
                                        <div style={{ padding: '8px 16px', background: uploadingAsset ? 'var(--bg-muted)' : 'var(--color-primary-500)', color: 'var(--text-inverse)', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                                            {uploadingAsset ? 'جاري معالجة وضغط الصورة...' : 'اختر الملف وارفعه'}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Assets list */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)' }}>سجل الأصول النشطة المعتمدة في النظام:</span>
                                {(assets ?? []).map(asset => (
                                    <div key={asset.id} style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <img src={asset.url} alt={asset.name} style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'white', borderRadius: '4px', padding: '2px', border: '1px solid var(--border-default)' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', fontWeight: 900, color: 'var(--text-primary)' }}>{asset.name}</div>
                                                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>الفئة: {asset.category} | النسخة v{asset.version} | المرفوع بواسطة {asset.uploadedBy}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={async () => {
                                                    // Apply as template background or replace settings stamp
                                                    if (asset.category === 'STAMPS') {
                                                        alert("تم استيراد الختم كختم رسمي نشط بالنظام!");
                                                    } else {
                                                        setTemplate(p => {
                                                            if (!p) return null;
                                                            return { ...p, backgroundUrl: asset.url };
                                                        });
                                                        setHasUnsavedChanges(true);
                                                        setSaveStatus('unsaved');
                                                        alert("تم تطبيق الشعار كخلفية رسمية للـ Canvas!");
                                                    }
                                                }}
                                                style={{ padding: '6px 10px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '9px', cursor: 'pointer' }}
                                            >
                                                استخدام
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ DIALOG 2: Historical Versions & Compare */}
            {showHistoryPanel && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '16px', width: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-warning)' }}><History size={16} /> سجل تغييرات وإصدارات قالب النشر</h3>
                            <button onClick={() => setShowHistoryPanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(template?.versionHistory ?? []).map((snap, idx) => (
                                <div key={idx} style={{ padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border-default)', borderRadius: '8px', display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-primary)' }}>الإصدار التاريخي v{snap.version}</div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>التاريخ: {new Date(snap.updatedAt).toLocaleString('ar-SA')}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--color-warning)', marginTop: '4px' }}>ملاحظات: {snap.changelog}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <button
                                            onClick={() => {
                                                setCompareTarget(snap);
                                                setShowCompareDialog(true);
                                            }}
                                            style={{ padding: '6px 12px', background: 'var(--bg-page)', border: '1px solid var(--border-default)', color: 'var(--text-primary)', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}
                                        >
                                            قارن الفروق
                                        </button>
                                        <button
                                            onClick={() => handleRollback(snap.version)}
                                            style={{ padding: '6px 12px', background: 'var(--color-success-bg)', border: '1px solid var(--color-success-border)', color: 'var(--color-success)', borderRadius: '4px', fontSize: '10px', cursor: 'pointer', fontWeight: 900 }}
                                        >
                                            استعادة الإصدار
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!template?.versionHistory || template.versionHistory.length === 0) && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>لا توجد إصدارات منشورة سابقة لهذا القالب.</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* 🛡️ DIALOG 3: Visual & Textual Version Compare */}
            {showCompareDialog && compareTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '16px', width: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 'var(--shadow-modal)' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--color-info)' }}>مقارنة فروق التصميم: الإصدار v{compareTarget.version} مقابل الإصدار الحالي v{template.version}</h3>
                            <button onClick={() => setShowCompareDialog(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={16} /></button>
                        </div>

                        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Textual Differences Compare */}
                            <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-info)', display: 'block', marginBottom: '10px' }}>مقارنة الحقول النصية ومواقعها (Textual Diff View):</span>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {(compareTarget?.fields ?? []).map(oldF => {
                                        const curF = fields.find(x => x.fieldId === oldF.fieldId);
                                        const oldMeta = getFieldMeta(oldF.fieldId);

                                        if (!curF) {
                                            return (
                                                <div key={oldF._uid} style={{ fontSize: '11px', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', padding: '6px', borderRadius: '4px', border: '1px solid var(--color-danger-border)' }}>
                                                    ❌ حقل مفقود في النسخة الحالية: {oldMeta?.label || oldF.fieldId} (الموضع التاريخي X: {oldF.x}%, Y: {oldF.y}%)
                                                </div>
                                            );
                                        }

                                        const textChanged = oldF.textContent !== curF.textContent;
                                        const posChanged = oldF.x !== curF.x || oldF.y !== curF.y;

                                        if (textChanged || posChanged) {
                                            return (
                                                <div key={oldF._uid} style={{ fontSize: '11px', color: 'var(--color-warning)', background: 'var(--color-warning-bg)', padding: '6px', borderRadius: '4px', border: '1px solid var(--color-warning-border)' }}>
                                                    ⚠️ حقل معدل: {oldMeta?.label || oldF.fieldId}
                                                    {textChanged && <div style={{ textIndent: '16px', marginTop: '2px' }}>- النص: "{oldF.textContent || 'فارغ'}" ← "{curF.textContent || 'فارغ'}"</div>}
                                                    {posChanged && <div style={{ textIndent: '16px', marginTop: '2px' }}>- الإحداثيات: X: {oldF.x}%, Y: {oldF.y}% ← X: {curF.x}%, Y: {curF.y}%</div>}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={oldF._uid} style={{ fontSize: '11px', color: 'var(--color-success)', background: 'var(--color-success-bg)', padding: '6px', borderRadius: '4px', border: '1px solid var(--color-success-border)' }}>
                                                ✓ حقل متطابق تماماً: {oldMeta?.label || oldF.fieldId}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── Floating Background Tasks Queue Drawer ─── */}
            {queueTasks.length > 0 && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '24px',
                        width: '320px',
                        background: 'var(--bg-surface)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-floating)',
                        padding: '14px',
                        zIndex: 9999,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', paddingBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>📥 طابور النشر والتصدير الخلفي ({(queueTasks ?? []).filter(t => t.status === 'running' || t.status === 'pending').length})</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                        {(queueTasks ?? []).map(task => (
                            <div key={task.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-subtle)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{task.label}</span>

                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {task.status === 'running' && (
                                            <button onClick={() => backgroundQueue.cancel(task.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }} title="إلغاء"><Ban size={10} /></button>
                                        )}
                                        {(task.status === 'failed' || task.status === 'cancelled') && (
                                            <button onClick={() => backgroundQueue.retry(task.id)} style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer' }} title="إعادة تشغيل"><RefreshCcw size={10} /></button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{ flex: 1, height: '4px', background: 'var(--bg-muted)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ width: `${task.progress}%`, height: '100%', background: task.status === 'failed' ? 'var(--color-danger)' : (task.status === 'completed' ? 'var(--color-success)' : 'var(--color-info)'), transition: 'width 0.1s' }} />
                                    </div>
                                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--text-secondary)' }}>{task.progress}%</span>
                                </div>
                                {task.error && <span style={{ fontSize: '8px', color: 'var(--color-danger)', textIndent: '4px' }}>خطأ: {task.error}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
