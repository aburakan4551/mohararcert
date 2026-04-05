import React, { memo, useCallback, useEffect, useRef, useState } from 'react'
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine'
import SignatureUploader from '../components/SignatureUploader'
import StampManager from '../components/StampManager'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useSerial } from '../hooks/useSerial'
import { useTemplates } from '../hooks/useTemplates'
import { useLayers } from '../hooks/useLayers'
import { exportSinglePDF, printElements } from '../utils/pdfExport'
import { CERTIFICATE_SCREENSHOT_PRESET_SETTINGS } from '../config/certificatePreset'
import { DIRECTOR_SIGNATURE_PRESETS, VISA_PRESETS } from '../config/assetPresets'

const BRANCH_TEMPLATE_NAME = 'شهادة شكر وتقدير الفرع'

/* ─────────────────────────────────────────
   useScaleFactor – measures the preview
   container and computes the CSS scale so
   the native-size certificate fits inside.
──────────────────────────────────────────── */
function useScaleFactor(containerRef) {
    const [scale, setScale] = useState(0.45)

    useEffect(() => {
        function measure() {
            const el = containerRef.current
            if (!el) return
            const A4_W_PX = 297 * (96 / 25.4) // ≈ 1122.5 at 96 dpi
            const A4_H_PX = 210 * (96 / 25.4) // ≈ 793.7
            const scaleW = el.clientWidth / A4_W_PX
            const scaleH = el.clientHeight / A4_H_PX
            setScale(Math.min(scaleW, scaleH))
        }

        const ro = new ResizeObserver(measure)
        if (containerRef.current) ro.observe(containerRef.current)
        measure()
        return () => ro.disconnect()
    }, [containerRef])

    return scale
}

/* ─────────────────────────────────────────
   FormSection tabs
──────────────────────────────────────────── */
const TABS = [
    { id: 'data', icon: '📝', label: 'البيانات' },
    { id: 'sigs', icon: '✍️', label: 'التوقيعات' },
    { id: 'export', icon: '🖨️', label: 'التصدير' },
]

/* ─────────────────────────────────────────
   DataTab — memoised to avoid re-renders
──────────────────────────────────────────── */
const DataTab = memo(function DataTab({ formData, setFormData, settings, setSettings, serialInput, setSerialInput, autoSerial, resetSerial, templates, selectedTemplateId, setSelectedTemplateId }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Template selector */}
            {templates.length > 0 && (
                <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">📄 نموذج الشهادة</label>
                    <select className="form-control"
                        value={selectedTemplateId || ''}
                        onChange={e => setSelectedTemplateId(e.target.value || null)}
                    >
                        <option value="">🎨 التصميم الكلاسيكي (بدون قالب)</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>
                                {t.isDefault ? '⭐ ' : ''}{t.name === 'قالب شهادة' ? BRANCH_TEMPLATE_NAME : t.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {/* Recipient name */}
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">اسم المستفيد *</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="اسم الموظف"
                    value={formData.recipientName}
                    onChange={e => {
                        const v = e.target.value
                        setFormData(p => ({ ...p, recipientName: v }))
                    }}
                />
            </div>

            {/* Reason prefix */}
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">بادئة النص</label>
                <input
                    type="text"
                    className="form-control"
                    value={settings.reasonPrefix}
                    onChange={e => setSettings(p => ({ ...p, reasonPrefix: e.target.value }))}
                />
            </div>

            {/* Reason text */}
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">سبب التكريم</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="مشاركته الفعالة في"
                    value={settings.reasonText}
                    onChange={e => setSettings(p => ({ ...p, reasonText: e.target.value }))}
                />
            </div>

            {/* Event */}
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">عنوان المناسبة *</label>
                <input
                    type="text"
                    className="form-control"
                    placeholder="مثال: ورشة عمل التميز الإداري"
                    value={formData.event}
                    onChange={e => setFormData(p => ({ ...p, event: e.target.value }))}
                />
            </div>

            {/* Date */}
            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">التاريخ</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.date}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">الرقم التسلسلي</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                        type="text"
                        className="form-control"
                        placeholder={`تلقائي: ${autoSerial}`}
                        value={serialInput}
                        onChange={e => setSerialInput(e.target.value)}
                        style={{ direction: 'ltr', textAlign: 'left', flex: 1 }}
                    />
                    <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ flexShrink: 0, fontSize: '0.75rem', padding: '4px 8px', whiteSpace: 'nowrap' }}
                        onClick={() => { resetSerial(202600002); setSerialInput('') }}
                        title="إعادة ضبط الرقم التسلسلي إلى 202600002"
                    >
                        🔄 ضبط
                    </button>
                </div>
                <p style={{ fontSize: '0.77rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    اتركه فارغاً للرقم التلقائي ({autoSerial})
                </p>
            </div>

            {/* QR toggle */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', background: 'var(--bg)', borderRadius: '8px' }}>
                <input
                    type="checkbox"
                    checked={formData.showQR}
                    onChange={e => setFormData(p => ({ ...p, showQR: e.target.checked }))}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>إظهار QR Code للتحقق</span>
            </label>

            {/* Colors inline */}
            <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg)', borderRadius: '8px' }}>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>اللون الرئيسي</label>
                    <input type="color" value={settings.primaryColor}
                        onChange={e => setSettings(p => ({ ...p, primaryColor: e.target.value }))}
                        style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
                </div>
                <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>اللون الذهبي</label>
                    <input type="color" value={settings.goldColor}
                        onChange={e => setSettings(p => ({ ...p, goldColor: e.target.value }))}
                        style={{ width: '100%', height: '36px', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', padding: '2px' }} />
                </div>
            </div>
        </div>
    )
})

/* ─────────────────────────────────────────
   SignaturesTab
──────────────────────────────────────────── */
const SignaturesTab = memo(function SignaturesTab({ settings, setSettings }) {
    const upd = useCallback((key, val) => setSettings(p => ({ ...p, [key]: val })), [setSettings])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Org */}
            <fieldset style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                <legend style={{ padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>🏢 الجهة</legend>
                <div className="form-group">
                    <label className="form-label">اسم الجهة</label>
                    <input className="form-control" value={settings.orgName} onChange={e => upd('orgName', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">اسم فرعي (اختياري)</label>
                    <input className="form-control" value={settings.orgSubName} onChange={e => upd('orgSubName', e.target.value)} />
                </div>
                <SignatureUploader label="الشعار" value={settings.orgLogo} onChange={v => upd('orgLogo', v)} hint="PNG/SVG شفاف" />
            </fieldset>

            {/* Director */}
            <fieldset style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                <legend style={{ padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>👤 المدير العام</legend>
                <div className="form-group">
                    <label className="form-label">الاسم</label>
                    <input className="form-control" value={settings.directorName} onChange={e => upd('directorName', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">المسمى الوظيفي</label>
                    <input className="form-control" value={settings.directorTitle} onChange={e => upd('directorTitle', e.target.value)} />
                </div>
                <SignatureUploader
                    label="التوقيع"
                    value={settings.directorSignature}
                    onChange={v => upd('directorSignature', v)}
                    presets={DIRECTOR_SIGNATURE_PRESETS}
                />
            </fieldset>

            {/* Visa */}
            <fieldset style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '14px' }}>
                <legend style={{ padding: '0 8px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>🔏 التأشيرة</legend>
                <div className="form-group">
                    <label className="form-label">التسمية</label>
                    <input className="form-control" value={settings.visaLabel} onChange={e => upd('visaLabel', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">اسم صاحب التأشيرة</label>
                    <input className="form-control" value={settings.visaName} onChange={e => upd('visaName', e.target.value)} />
                </div>
                <SignatureUploader
                    label="توقيع التأشيرة"
                    value={settings.visaSignature}
                    onChange={v => upd('visaSignature', v)}
                    presets={VISA_PRESETS}
                />
            </fieldset>

            {/* Stamp */}
            <StampManager settings={settings} onSettingsChange={setSettings} />
        </div>
    )
})

/* ─────────────────────────────────────────
   ExportTab
──────────────────────────────────────────── */
const ExportTab = memo(function ExportTab({ onExportPDF, onPrint, exporting, saved, previewSerial, recipientName }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {saved && (
                <div className="alert alert-success">
                    ✅ حُفظت في السجل برقم: <strong>{previewSerial}</strong>
                </div>
            )}

            <button className="btn btn-gold btn-block btn-lg" onClick={onExportPDF}
                disabled={exporting || !recipientName}>
                {exporting ? '⏳ جاري التصدير...' : '📄 تصدير PDF'}
            </button>

            <button className="btn btn-primary btn-block" onClick={onPrint}
                disabled={!recipientName}>
                🖨️ طباعة الشهادة
            </button>

            <div style={{ background: 'var(--bg)', borderRadius: '8px', padding: '12px', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text-dark)' }}>ملاحظات:</strong>
                <ul style={{ margin: '6px 0 0 0', paddingRight: '16px' }}>
                    <li>عند التصدير سيُسجَّل الرقم التسلسلي تلقائياً.</li>
                    <li>جودة التصدير: 3× (مناسبة للطباعة).</li>
                    <li>تنسيق الصفحة: A4 أفقي.</li>
                </ul>
            </div>
        </div>
    )
})

/* ─────────────────────────────────────────
   MAIN PAGE
──────────────────────────────────────────── */
export default function CreateCertificate() {
    /* ── State ── */
    const [settings, setSettings] = useLocalStorage('certSettings', CERTIFICATE_SCREENSHOT_PRESET_SETTINGS)

    const [registry, setRegistry] = useLocalStorage('certificateRegistry', [])
    const { getNextSerial, consumeSerial, resetSerial } = useSerial()
    const { templates, getTemplate, activeTemplateId, setActiveTemplateId, updateTemplate } = useTemplates()

    // Template is now shared via localStorage — same ID used in /settings
    const selectedTemplateId = activeTemplateId
    const setSelectedTemplateId = setActiveTemplateId
    const activeTemplate = selectedTemplateId ? getTemplate(selectedTemplateId) : null

    // Read layers from the design editor for this template (same key as /settings)
    const { layers: editorLayers, canvasWidth } = useLayers(selectedTemplateId || 'default')

    const [formData, setFormData] = useState({
        recipientName: '',
        event: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        showQR: false,
    })
    const [serialInput, setSerialInput] = useState('')
    const [activeTab, setActiveTab] = useState('data')
    const [exporting, setExporting] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        const currentTemplate = activeTemplateId ? getTemplate(activeTemplateId) : null
        if (currentTemplate?.name === 'قالب شهادة') {
            updateTemplate(currentTemplate.id, { name: BRANCH_TEMPLATE_NAME })
        }
    }, [activeTemplateId, getTemplate, updateTemplate])

    /* ── Refs ── */
    const certRef = useRef()
    const previewContainerRef = useRef()

    /* ── Computed ── */
    const autoSerial = getNextSerial()
    const previewSerial = serialInput.trim() || autoSerial

    const certData = {
        recipientName: formData.recipientName || 'اسم المستفيد',
        event: formData.event || 'عنوان المناسبة',
        date: formData.date,
        serial: previewSerial,
    }

    /* ── Scale factor: fill preview container ── */
    const scale = useScaleFactor(previewContainerRef)

    /* ── Handlers ── */
    const handleExportPDF = useCallback(async () => {
        if (!formData.recipientName) return alert('يرجى إدخال اسم المستفيد أولاً')
        setExporting(true)
        const serial = serialInput.trim() ? serialInput.trim() : consumeSerial()
        setRegistry(prev => [...prev, {
            serial,
            name: formData.recipientName,
            event: formData.event,
            date: formData.date,
            createdAt: new Date().toISOString(),
        }])
        setSaved(true)
        try {
            await exportSinglePDF(certRef.current, `شهادة-${formData.recipientName}.pdf`)
        } catch (e) {
            alert('خطأ في التصدير: ' + e.message)
        }
        setExporting(false)
    }, [formData, serialInput, consumeSerial, setRegistry])

    const handlePrint = useCallback(() => {
        if (!formData.recipientName) return alert('يرجى إدخال اسم المستفيد')
        printElements(
            [certRef.current],
            `طباعة الشهادة - ${formData.recipientName}`
        )
    }, [formData.recipientName])

    /* ── Render ── */
    return (
        /*
          editor-layout breaks out of the parent .page-content padding/overflow
          by using negative margins so it occupies the full viewport.
          The app-layout sidebar is 260px on the right.
        */
        <div className="editor-layout">

            {/* ══════════ FORM PANEL (right, RTL) ══════════ */}
            <div className="editor-form-panel">

                {/* Panel header */}
                <div className="editor-form-header">
                    📜 إنشاء شهادة
                </div>

                {/* Tabs */}
                <div className="editor-tabs">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className={`editor-tab${activeTab === t.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(t.id)}
                            type="button"
                        >
                            <span>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab body — independently scrollable */}
                <div className="editor-section">
                    {activeTab === 'data' && (
                        <DataTab
                            formData={formData}
                            setFormData={setFormData}
                            settings={settings}
                            setSettings={setSettings}
                            serialInput={serialInput}
                            setSerialInput={setSerialInput}
                            autoSerial={autoSerial}
                            resetSerial={resetSerial}
                            templates={templates}
                            selectedTemplateId={selectedTemplateId}
                            setSelectedTemplateId={setSelectedTemplateId}
                        />
                    )}
                    {activeTab === 'sigs' && (
                        <SignaturesTab settings={settings} setSettings={setSettings} />
                    )}
                    {activeTab === 'export' && (
                        <ExportTab
                            onExportPDF={handleExportPDF}
                            onPrint={handlePrint}
                            exporting={exporting}
                            saved={saved}
                            previewSerial={previewSerial}
                            recipientName={formData.recipientName}
                        />
                    )}
                </div>

                {/* Pinned action bar */}
                <div className="editor-action-bar">
                    <button className="btn btn-gold" style={{ flex: 1 }}
                        onClick={handleExportPDF} disabled={exporting || !formData.recipientName}>
                        {exporting ? '⏳...' : '📄 PDF'}
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }}
                        onClick={handlePrint} disabled={!formData.recipientName}>
                        🖨️ طباعة
                    </button>
                    <button className="btn btn-outline btn-sm"
                        onClick={() => setActiveTab('export')}>
                        ⚙️
                    </button>
                </div>
            </div>

            {/* ══════════ PREVIEW PANEL (left, fills remaining) ══════════ */}
            <div className="editor-preview-panel">

                {/* Toolbar */}
                <div className="editor-preview-toolbar">
                    <div className="editor-preview-toolbar-title">
                        <span>👁️</span> معاينة مباشرة
                    </div>
                    <div className="editor-preview-toolbar-actions">
                        <span className="preview-badge">A4 أفقي 297×210mm</span>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                            تكبير: {Math.round(scale * 100)}%
                        </span>
                        {formData.recipientName && (
                            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                                #{previewSerial}
                            </span>
                        )}
                    </div>
                </div>

                {/* Canvas */}
                <div className="editor-preview-canvas" ref={previewContainerRef}>
                    <div className="cert-scale-wrapper">
                        <div className="cert-scale-inner">
                            {/*
                cert-transform-host is 297mm × 210mm at native size.
                We scale it down so it fills cert-scale-inner precisely.
              */}
                            <div
                                className="cert-transform-host"
                                style={{ '--cert-scale': scale }}
                            >
                                <UnifiedCertificateEngine
                                    ref={certRef}
                                    mode="preview"
                                    template={activeTemplate}
                                    layers={editorLayers}
                                    canvasWidth={canvasWidth}
                                    data={certData}
                                    settings={settings}
                                    showQR={formData.showQR}
                                />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
