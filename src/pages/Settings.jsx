import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { useLayers } from '../hooks/useLayers'
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine'
import LayersPanel from '../components/LayersPanel'
import PropertiesPanel from '../components/PropertiesPanel'
import { pdfPageToDataURL, readFileAsArrayBuffer, readFileAsDataURL } from '../utils/pdfToImage'
import { useLocalStorage } from '../hooks/useLocalStorage'
import {
    CERTIFICATE_SCREENSHOT_PRESET_SETTINGS,
    createScreenshotPresetLayers,
} from '../config/certificatePreset'
import { TEMPLATE_PRESETS } from '../config/assetPresets'

/**
 * Settings – Professional Layer-based Design Editor
 *
 * Full-height 3-panel layout with toolbar.
 * Auto-saves via useLocalStorage. Save status shown in toolbar.
 * Keyboard shortcuts: Ctrl+Z/Y, Delete, Ctrl+D, Ctrl+G, Ctrl+L
 */
export default function Settings() {
    const { templates, addTemplate, activeTemplateId, setActiveTemplateId } = useTemplates()

    // Auto-select first template if none is active
    React.useEffect(() => {
        if (!activeTemplateId && templates.length > 0) {
            setActiveTemplateId(templates[0].id)
        }
    }, [activeTemplateId, templates, setActiveTemplateId])

    const activeTemplate = templates.find(t => t.id === activeTemplateId) || null

    const {
        layers, updateLayer, updateLayerStyle,
        moveLayer, resizeLayer,
        toggleVisibility, toggleLock,
        deleteLayer, duplicateLayer,
        bringForward, sendBackward,
        addLayer, alignLayer,
        resetLayers,
        replaceLayers,
        undo, redo, pushHistory,
        saveStatus,
        setCanvasWidth,
    } = useLayers(activeTemplateId || 'default')

    const [selectedId, setSelectedId] = useState(null)
    const [showGrid, setShowGrid] = useState(false)
    const [showGuides, setShowGuides] = useState(true)
    const [zoom, setZoom] = useState(100)
    const [uploadError, setUploadError] = useState(null)
    const [, setCertificateSettings] = useLocalStorage('certSettings', CERTIFICATE_SCREENSHOT_PRESET_SETTINGS)
    const fileRef = useRef(null)

    const selectedLayer = layers.find(l => l.id === selectedId) || null

    /* ── Keyboard shortcuts ── */
    useEffect(() => {
        const handler = (e) => {
            const tag = document.activeElement?.tagName
            const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

            // Ctrl shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'z':
                        e.preventDefault()
                        undo()
                        return
                    case 'y':
                        e.preventDefault()
                        redo()
                        return
                    case 'd':
                        e.preventDefault()
                        if (selectedId) duplicateLayer(selectedId)
                        return
                    case 'g':
                        e.preventDefault()
                        setShowGrid(g => !g)
                        return
                    case 'l':
                        e.preventDefault()
                        if (selectedId) toggleLock(selectedId)
                        return
                }
            }

            // Delete key (not in inputs)
            if (e.key === 'Delete' && selectedId && !isInput) {
                deleteLayer(selectedId)
                setSelectedId(null)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [undo, redo, selectedId, deleteLayer, duplicateLayer, toggleLock])

    /* ── Add new layer factory ── */
    const handleAddLayer = useCallback((type) => {
        const id = `${type}-${Date.now().toString(36)}`
        const base = {
            id, type, x: 50, y: 50,
            visible: true, locked: false, zIndex: 0,
        }
        switch (type) {
            case 'text':
                addLayer({
                    ...base, label: 'نص جديد', width: 200, height: 30,
                    style: { fontSize: 16, fontWeight: '600', color: '#1a3a6b', fontFamily: 'Cairo', textAlign: 'center' }
                })
                break
            case 'image':
                addLayer({
                    ...base, label: 'صورة جديدة', width: 120, height: 80,
                    style: { opacity: 1, rotation: 0 }
                })
                break
            case 'shape':
                addLayer({
                    ...base, label: 'شكل', width: 150, height: 60,
                    style: { fill: 'rgba(201,162,39,0.15)', borderColor: '#c9a227', borderWidth: 1, borderRadius: '0' }
                })
                break
            case 'qr':
                addLayer({ ...base, label: 'QR Code', width: 70, height: 70, style: {} })
                break
        }
        setSelectedId(id)
    }, [addLayer])

    /* ── Template upload ── */
    const handleUpload = async (file) => {
        if (!file) return
        setUploadError(null)
        const isPDF = file.type === 'application/pdf'
        const isImage = file.type.startsWith('image/')
        if (!isPDF && !isImage) { setUploadError('PDF / PNG / JPG فقط'); return }

        try {
            let dataURL
            if (isPDF) {
                dataURL = await pdfPageToDataURL(await readFileAsArrayBuffer(file), 2.5)
            } else {
                dataURL = await readFileAsDataURL(file)
            }
            const name = file.name.replace(/\.[^.]+$/, '')
            addTemplate(name, dataURL, isPDF ? 'pdf' : 'image')
        } catch (err) {
            setUploadError(err.message)
        }
    }

    const handleApplyScreenshotPreset = useCallback(() => {
        replaceLayers(createScreenshotPresetLayers())
        setCertificateSettings((current) => ({
            ...current,
            ...CERTIFICATE_SCREENSHOT_PRESET_SETTINGS,
        }))
        setSelectedId(null)
    }, [replaceLayers, setCertificateSettings])

    const handleAddTemplatePreset = useCallback(async (preset) => {
        setUploadError(null)
        try {
            const existing = templates.find((template) => template.name === preset.name)
            if (existing) {
                setActiveTemplateId(existing.id)
                return
            }

            const response = await fetch(preset.src)
            if (!response.ok) throw new Error('تعذر تحميل القالب الجاهز')

            let dataURL
            if (preset.type === 'pdf') {
                dataURL = await pdfPageToDataURL(await response.arrayBuffer(), 2.5)
            } else {
                const blob = await response.blob()
                dataURL = await new Promise((resolve, reject) => {
                    const reader = new FileReader()
                    reader.onload = () => resolve(reader.result)
                    reader.onerror = reject
                    reader.readAsDataURL(blob)
                })
            }

            const id = addTemplate(preset.name, dataURL, preset.type)
            setActiveTemplateId(id)
        } catch (error) {
            setUploadError(error.message)
        }
    }, [addTemplate, setActiveTemplateId, templates])

    /* ── Save status badge ── */
    const saveIcon = saveStatus === 'saved' ? '🟢' : saveStatus === 'saving' ? '🟡' : '🔴'
    const saveLabel = saveStatus === 'saved' ? 'محفوظ' : saveStatus === 'saving' ? 'جارِ الحفظ...' : 'خطأ'

    return (
        <div className="design-editor" style={{ direction: 'rtl' }}>

            {/* ══════════ TOP TOOLBAR ══════════ */}
            <div className="de-toolbar">
                {/* Right cluster: template + upload */}
                <div className="de-toolbar-group">
                    <span className="de-toolbar-brand">🎨 محرر التصميم</span>
                    <select
                        className="de-select"
                        value={activeTemplateId || ''}
                        onChange={e => { setActiveTemplateId(e.target.value || null); setSelectedId(null) }}
                    >
                        <option value="">بدون قالب</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.isDefault ? '⭐ ' : ''}{t.name}</option>
                        ))}
                    </select>
                    <button className="de-btn" onClick={() => fileRef.current?.click()} title="رفع قالب جديد">📄+</button>
                    <button className="de-btn" onClick={() => handleAddTemplatePreset(TEMPLATE_PRESETS[0])} title="إضافة قالب الفرع الجاهز">⭐</button>
                    <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                        onChange={e => handleUpload(e.target.files[0])} />
                    {uploadError && <span style={{ color: '#f44', fontSize: '0.75rem' }}>⚠️ {uploadError}</span>}
                </div>

                {/* Center cluster: view controls */}
                <div className="de-toolbar-group">
                    <button className={`de-btn${showGrid ? ' active' : ''}`} onClick={() => setShowGrid(!showGrid)} title="شبكة (Ctrl+G)">
                        ⊞
                    </button>
                    <button className={`de-btn${showGuides ? ' active' : ''}`} onClick={() => setShowGuides(!showGuides)} title="خطوط إرشاد">
                        ┼
                    </button>
                    <span className="de-sep" />
                    <button className="de-btn" onClick={() => setZoom(z => Math.max(40, z - 10))}>−</button>
                    <span className="de-zoom">{zoom}%</span>
                    <button className="de-btn" onClick={() => setZoom(z => Math.min(200, z + 10))}>+</button>
                    <button className="de-btn" onClick={() => setZoom(100)}>⟳</button>
                </div>

                {/* Left cluster: save + undo/redo + reset */}
                <div className="de-toolbar-group">
                    {/* Save status */}
                    <span className="de-save-status" title={saveLabel} style={{
                        fontSize: '0.78rem',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        color: saveStatus === 'saved' ? '#4ade80' : saveStatus === 'saving' ? '#facc15' : '#f87171',
                        transition: 'color 0.3s',
                    }}>
                        {saveIcon} {saveLabel}
                    </span>
                    <span className="de-sep" />
                    <button className="de-btn" onClick={undo} title="تراجع (Ctrl+Z)">↩</button>
                    <button className="de-btn" onClick={redo} title="إعادة (Ctrl+Y)">↪</button>
                    <span className="de-sep" />
                    <button className="de-btn" onClick={handleApplyScreenshotPreset} title="تطبيق إعدادات الصورة">مطابقة</button>
                    <button className="de-btn danger" onClick={resetLayers} title="إعادة تعيين الطبقات">🔄</button>
                </div>
            </div>

            {/* ══════════ MAIN BODY: 3-panel ══════════ */}
            <div className="de-body">

                {/* ── RIGHT: Layers Panel ── */}
                <LayersPanel
                    layers={layers}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onToggleVisibility={toggleVisibility}
                    onToggleLock={toggleLock}
                    onDelete={(id) => { deleteLayer(id); setSelectedId(null) }}
                    onDuplicate={duplicateLayer}
                    onBringForward={bringForward}
                    onSendBackward={sendBackward}
                    onAddLayer={handleAddLayer}
                />

                {/* ── CENTER: Canvas ── */}
                <div className="de-canvas-container">
                    <div style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s',
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <UnifiedCertificateEngine
                            mode="editor"
                            template={activeTemplate}
                            layers={layers}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onMove={moveLayer}
                            onResize={resizeLayer}
                            onDragStart={pushHistory}
                            onCanvasReady={setCanvasWidth}
                            showGrid={showGrid}
                            showGuides={showGuides}
                        />
                    </div>
                </div>

                {/* ── LEFT: Properties Panel ── */}
                <PropertiesPanel
                    layer={selectedLayer}
                    onUpdate={updateLayer}
                    onUpdateStyle={updateLayerStyle}
                    onAlign={alignLayer}
                />
            </div>

            {/* ── Shortcut hints (subtle) ── */}
            <div style={{
                position: 'fixed', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
                fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)',
                display: 'flex', gap: '16px', zIndex: 10,
                pointerEvents: 'none',
            }}>
                <span>Ctrl+Z تراجع</span>
                <span>Ctrl+Y إعادة</span>
                <span>Ctrl+D نسخ</span>
                <span>Ctrl+G شبكة</span>
                <span>Ctrl+L قفل</span>
                <span>Del حذف</span>
            </div>
        </div>
    )
}
