import React, { useRef, useState, useCallback, useMemo } from 'react'
import CertificateTemplate from '../components/CertificateTemplate'
import ExcelImporter from '../components/ExcelImporter'
import TemplateSelector from '../components/TemplateSelector'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useTemplates } from '../hooks/useTemplates'
import { useLayers } from '../hooks/useLayers'
import { useSerial } from '../hooks/useSerial'
import { exportMergedPDF, exportSeparatePDFs } from '../utils/pdfExport'

export default function BatchCreate() {
    const { templates, getTemplate, activeTemplateId } = useTemplates()
    const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplateId || (templates[0]?.id))
    
    // Retrieve layers for the selected template
    const { layers, canvasWidth } = useLayers(selectedTemplateId || 'default')
    const activeTemplate = useMemo(() => getTemplate(selectedTemplateId), [selectedTemplateId, getTemplate])

    const [settings] = useLocalStorage('certSettings', {})
    const [registry, setRegistry] = useLocalStorage('certificateRegistry', [])
    const { getNextSerial, consumeMultiple } = useSerial()

    const [names, setNames] = useState([])
    const [commonData, setCommonData] = useState({
        event: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        showQR: true
    })
    const [serials, setSerials] = useState([])
    const [step, setStep] = useState(1) // 1=Select Template, 2=Import, 3=Configure, 4=Preview+Export
    const [exporting, setExporting] = useState(false)
    const [progress, setProgress] = useState(0)
    const [exportDone, setExportDone] = useState(false)

    const certRefs = useRef({})

    const handleImport = (importedNames) => {
        setNames(importedNames)
        setSerials([])
        setExportDone(false)
    }

    const handleGenerateSerials = () => {
        const newSerials = consumeMultiple(names.length)
        setSerials(newSerials)
        // Save to registry
        const records = names.map((item, i) => ({
            serial: newSerials[i],
            name: item.name,
            event: commonData.event,
            date: commonData.date,
            createdAt: new Date().toISOString()
        }))
        setRegistry(prev => [...prev, ...records])
        setStep(4)
    }

    const handleExportMerged = async () => {
        setExporting(true)
        setProgress(0)
        const elements = serials.map((s, i) => certRefs.current[`cert-${i}`])
        try {
            await exportMergedPDF(
                elements.filter(Boolean),
                `شهادات-${commonData.event || 'دفعة'}.pdf`,
                (done, total) => setProgress(Math.round((done / total) * 100))
            )
            setExportDone(true)
        } catch (e) {
            alert('خطأ في التصدير: ' + e.message)
        }
        setExporting(false)
    }

    const handleExportSeparate = async () => {
        setExporting(true)
        setProgress(0)
        const items = serials.map((s, i) => ({
            element: certRefs.current[`cert-${i}`],
            name: names[i]?.name,
            serial: s
        }))
        try {
            await exportSeparatePDFs(
                items.filter(it => it.element),
                (done, total) => setProgress(Math.round((done / total) * 100))
            )
            setExportDone(true)
        } catch (e) {
            alert('خطأ في التصدير: ' + e.message)
        }
        setExporting(false)
    }

    const handlePrintAll = () => {
        window.print()
    }

    return (
        <div className="batch-create-page">
            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '28px' }} className="no-print">
                {[1, 2, 3, 4].map((s, i) => (
                    <React.Fragment key={s}>
                        <div style={{
                            flex: 1,
                            padding: '12px 16px',
                            background: step >= s ? 'var(--gold, #c9a227)' : 'var(--border, #eee)',
                            color: step >= s ? 'white' : 'var(--text-muted, #777)',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            borderRadius: i === 0 ? '12px 0 0 12px' : i === 3 ? '0 12px 12px 0' : 0,
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: step === s ? 'inset 0 -4px 0 rgba(0,0,0,0.1)' : 'none'
                        }}>
                            {['🎨 القالب', '📊 استيراد', '⚙️ الإعدادات', '👁️ معاينة'][i]}
                        </div>
                        {i < 3 && <div style={{ width: '2px', background: 'var(--bg, #f4f4f4)' }} />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Template Selection */}
            {step === 1 && (
                <div className="card fade-in">
                    <div className="card-title">🎨 اختر قالب الشهادة</div>
                    <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                        يرجى اختيار التصميم الذي سيتم استخدامه لجميع الشهادات في هذه الدفعة.
                    </div>
                    <TemplateSelector 
                        selectedId={selectedTemplateId} 
                        onSelect={setSelectedTemplateId} 
                    />
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button 
                            className="btn btn-gold" 
                            disabled={!selectedTemplateId}
                            onClick={() => setStep(2)}
                        >
                            التالي: استيراد البيانات ←
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Import */}
            {step === 2 && (
                <div className="card fade-in">
                    <div className="card-title">📊 استيراد أسماء من Excel</div>
                    <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                        💡 تأكد من أن ملف Excel يحتوي على عمود باسم <strong>"الاسم"</strong> أو <strong>"Name"</strong>. إذا لم يوجد، سيتم قراءة العمود الأول.
                    </div>
                    <ExcelImporter onImport={handleImport} />
                    {names.length > 0 && (
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                            <button className="btn btn-outline" onClick={() => setStep(1)}>← القوالب</button>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={() => setStep(3)}>
                                التالي: ضبط البيانات ←
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Configure */}
            {step === 3 && (
                <div className="card fade-in">
                    <div className="card-title">⚙️ بيانات مشتركة لجميع الشهادات</div>

                    <div className="form-group">
                        <label className="form-label">عنوان المناسبة *</label>
                        <input type="text" className="form-control"
                            placeholder="مثال: ورشة عمل التميز الإداري 2025"
                            value={commonData.event}
                            onChange={e => setCommonData(p => ({ ...p, event: e.target.value }))} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">التاريخ</label>
                        <input type="text" className="form-control"
                            value={commonData.date}
                            onChange={e => setCommonData(p => ({ ...p, date: e.target.value }))} />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={commonData.showQR}
                                onChange={e => setCommonData(p => ({ ...p, showQR: e.target.checked }))} />
                            <span>إظهار QR Code للتحقق</span>
                        </label>
                    </div>

                    <div className="alert alert-info">
                        📊 سيتم إنشاء <strong>{names.length}</strong> شهادة مع أرقام تسلسلية متتابعة ابتداءً من&nbsp;
                        <strong>{getNextSerial()}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-outline" onClick={() => setStep(2)}>← رجوع</button>
                        <button
                            className="btn btn-gold"
                            style={{ flex: 1 }}
                            onClick={handleGenerateSerials}
                            disabled={!commonData.event}
                        >
                            ✨ توليد الشهادات وتعيين الأرقام
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Preview + Export */}
            {step === 4 && (
                <div className="fade-in">
                    <div className="card" style={{ marginBottom: '20px' }}>
                        <div className="card-title">🖨️ تصدير وطباعة الدفعة</div>

                        {exporting && (
                            <div style={{ marginBottom: '16px' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                    ⏳ جاري التصدير... {progress}%
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${progress}%` }} />
                                </div>
                            </div>
                        )}

                        {exportDone && (
                            <div className="alert alert-success" style={{ marginBottom: '12px' }}>
                                ✅ تم التصدير بنجاح! تم إنشاء <strong>{serials.length}</strong> شهادة.
                            </div>
                        )}

                        <div className="grid-3" style={{ gap: '10px' }}>
                            <button className="btn btn-gold" onClick={handleExportMerged} disabled={exporting}>
                                📄 PDF مدمج
                            </button>
                            <button className="btn btn-primary" onClick={handleExportSeparate} disabled={exporting}>
                                📂 PDF منفصل
                            </button>
                            <button className="btn btn-success no-print" onClick={handlePrintAll} disabled={exporting}>
                                🖨️ طباعة الكل
                            </button>
                        </div>

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button className="btn btn-sm btn-outline no-print" onClick={() => setStep(3)}>← تعديل البيانات</button>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                                تم حفظ {serials.length} شهادة في السجل تلقائياً
                            </p>
                        </div>
                    </div>

                    {/* Batch Preview */}
                    <div className="card">
                        <div className="card-title">👁️ معاينة الشهادات ({names.length})</div>
                        <div className="batch-preview-grid">
                            {names.map((item, i) => (
                                <div key={i} className="preview-item">
                                    <div className="preview-header">
                                        {i + 1}. {item.name} | رقم: {serials[i]}
                                    </div>
                                    <div className="preview-body">
                                        <div className="preview-scale">
                                            <CertificateTemplate
                                                ref={el => { certRefs.current[`cert-${i}`] = el }}
                                                template={activeTemplate}
                                                layers={layers}
                                                canvasWidth={canvasWidth}
                                                data={{
                                                    recipientName: item.name,
                                                    event: commonData.event,
                                                    date: commonData.date,
                                                    serial: serials[i]
                                                }}
                                                settings={settings}
                                                showQR={commonData.showQR}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `
                .batch-create-page .fade-in { animation: fadeIn 0.5s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                .batch-preview-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                .preview-item {
                    border: 1px solid var(--border, #eee);
                    border-radius: 12px;
                    overflow: hidden;
                    background: white;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                }
                .preview-header {
                    background: var(--primary, #1a3a6b);
                    color: white;
                    padding: 8px 14px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .preview-body {
                    background: #f0f0f0;
                    padding: 10px;
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    min-height: 180px;
                    position: relative;
                }
                .preview-scale {
                    transform: scale(0.28);
                    transform-origin: top center;
                    margin-bottom: -570px;
                }
                @media print {
                    .no-print { display: none !important; }
                    .batch-preview-grid { display: block; }
                    .preview-item { border: none; box-shadow: none; break-after: page; }
                    .preview-header { display: none; }
                    .preview-body { background: white; padding: 0; overflow: visible; }
                    .preview-scale { transform: none; margin-bottom: 0; }
                }
            `}} />
        </div>
    )
}

