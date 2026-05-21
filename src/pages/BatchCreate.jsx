import React, { useRef, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import CertificateTemplate from '../components/CertificateTemplate'
import ExcelImporter from '../components/ExcelImporter'
import TemplateSelector from '../components/TemplateSelector'
import { useTemplates } from '../hooks/useTemplates'
import { useLayers } from '../hooks/useLayers'
import { useSerial } from '../hooks/useSerial'
import { useAuth } from '../context/AuthContext'
import { dbService, auditService, notificationService } from '../services/db'
import { Save, Send, Sparkles, Database, FileText, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react'

const BRANCH_TEMPLATE_NAME = 'شهادة شكر وتقدير الفرع'

export default function BatchCreate() {
    const { user, settings } = useAuth()
    const navigate = useNavigate()
    const { templates, getTemplate, activeTemplateId } = useTemplates()
    const [selectedTemplateId, setSelectedTemplateId] = useState(activeTemplateId || (templates[0]?.id))
    
    // Retrieve layers for the selected template
    const { layers, canvasWidth } = useLayers(selectedTemplateId || 'default')
    const activeTemplate = useMemo(() => getTemplate(selectedTemplateId), [selectedTemplateId, getTemplate])

    const { getNextSerial, consumeMultiple } = useSerial()

    const [names, setNames] = useState([])
    const [commonData, setCommonData] = useState({
        event: '',
        reasonText: '',
        date: new Date().toLocaleDateString('ar-SA', { dateStyle: 'long' }),
        showQR: true,
        directSubmit: false // True = directly PENDING_APPROVAL, False = DRAFT
    })
    const [serials, setSerials] = useState([])
    const [step, setStep] = useState(1) // 1=Select Template, 2=Import, 3=Configure, 4=Preview & Save
    const [saving, setSaving] = useState(false)
    const [saveProgress, setSaveProgress] = useState(0)
    const [saveDone, setSaveDone] = useState(false)
    const [createdIds, setCreatedIds] = useState([])

    const certRefs = useRef({})

    const handleImport = (importedNames) => {
        setNames(importedNames)
        setSerials([])
        setSaveDone(false)
    }

    const handleGenerateSerials = () => {
        if (!commonData.event.trim()) return alert('الرجاء إدخال عنوان المناسبة')
        if (!commonData.reasonText.trim()) return alert('الرجاء إدخال سبب التكريم')
        
        const newSerials = consumeMultiple(names.length)
        setSerials(newSerials)
        setStep(4)
    }

    const handleBulkSave = async () => {
        if (names.length === 0 || serials.length === 0) return
        
        setSaving(true)
        setSaveProgress(0)
        
        const targetStatus = commonData.directSubmit ? 'PENDING_APPROVAL' : 'DRAFT'
        const ids = []
        
        try {
            for (let i = 0; i < names.length; i++) {
                const nameItem = names[i]
                const serial = serials[i]
                
                const payload = {
                    recipientName: nameItem.name,
                    event: commonData.event,
                    reasonText: commonData.reasonText,
                    date: commonData.date,
                    serial: serial,
                    showQR: commonData.showQR,
                    status: targetStatus,
                    templateId: selectedTemplateId,
                    createdBy: user.id,
                    creatorName: user.name,
                    comments: targetStatus === 'PENDING_APPROVAL' ? 'تم الرفع للاعتماد دفعة واحدة عبر ملف Excel' : 'مسودة مستوردة دفعة واحدة',
                    workflowHistory: [
                        {
                            stage: 'DRAFT',
                            timestamp: new Date().toISOString(),
                            user: user.name,
                            comments: 'إنشاء عبر الدفعة المستوردة'
                        }
                    ]
                }
                
                if (targetStatus === 'PENDING_APPROVAL') {
                    payload.workflowHistory.push({
                        stage: 'PENDING_APPROVAL',
                        timestamp: new Date().toISOString(),
                        user: user.name,
                        comments: 'رفع للاعتماد مباشرة'
                    })
                }
                
                const newCert = await dbService.create(payload)
                ids.push(newCert.id)
                
                // Update progress percentage
                setSaveProgress(Math.round(((i + 1) / names.length) * 100))
                
                // Small artificial delay to show progress and ensure stability
                await new Promise(r => setTimeout(r, 40))
            }
            
            // Log security audit
            await auditService.log(
                'CREATE_CERTIFICATE',
                user,
                `إنشاء دفعة شهادات (${names.length} شهادة) بصفة ${targetStatus === 'PENDING_APPROVAL' ? 'معلق للاعتماد' : 'مسودات'} بنجاح`
            )
            
            // Send single summary notification to Assistant if submitted directly
            if (targetStatus === 'PENDING_APPROVAL') {
                await notificationService.create({
                    userId: 'usr-2', // Assistant Manager
                    message: `دفعة شهادات جديدة (${names.length} شهادة) مرفوعة بانتظار المراجعة والاعتماد`,
                    type: 'pending'
                })
            }
            
            setCreatedIds(ids)
            setSaveDone(true)
            
        } catch (e) {
            console.error(e)
            alert('حدث خطأ أثناء حفظ شهادات الدفعة: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            
            {/* Step indicator */}
            <div className="flex items-center gap-0 bg-white dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm no-print">
                {[1, 2, 3, 4].map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black transition-all ${
                            step === s 
                                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10' 
                                : step > s 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : 'text-slate-400 dark:text-slate-600'
                        }`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                step === s 
                                    ? 'bg-slate-950 text-amber-500' 
                                    : step > s 
                                        ? 'bg-emerald-500 text-white' 
                                        : 'bg-slate-100 dark:bg-slate-900 text-slate-400'
                            }`}>
                                {s}
                            </span>
                            <span>{['اختيار القالب', 'استيراد الأسماء', 'صياغة البيانات', 'تأكيد وحفظ'][i]}</span>
                        </div>
                        {i < 3 && <div className="h-px w-6 bg-slate-200 dark:bg-slate-800 mx-2" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Step 1: Template Selection */}
            {step === 1 && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-amber-500" />
                            اختر القالب الموحد للدفعة
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            سيتم تطبيق هذا القالب وتصميم الخلفية على جميع الأسماء المستوردة في هذه الدفعة.
                        </p>
                    </div>

                    <TemplateSelector 
                        selectedId={selectedTemplateId} 
                        onSelect={setSelectedTemplateId} 
                    />

                    <div className="flex justify-end pt-2">
                        <button 
                            className="py-2.5 px-6 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-40" 
                            disabled={!selectedTemplateId}
                            onClick={() => setStep(2)}
                        >
                            <span>الخطوة التالية: استيراد الأسماء</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Import */}
            {step === 2 && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <Database className="w-5 h-5 text-amber-500" />
                            استيراد قوائم الأسماء من ملف Excel
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            💡 يرجى التأكد من احتواء الملف على عمود معنون باسم <strong>"الاسم"</strong> أو <strong>"Name"</strong>.
                        </p>
                    </div>

                    <ExcelImporter onImport={handleImport} />

                    {names.length > 0 && (
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60">
                            <button 
                                className="py-2 px-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                onClick={() => setStep(1)}
                            >
                                ← القوالب
                            </button>
                            <button 
                                className="py-2.5 px-6 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                                onClick={() => setStep(3)}
                            >
                                <span>الخطوة التالية: ضبط البيانات المشتركة</span>
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Step 3: Configure */}
            {step === 3 && (
                <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 max-w-xl mx-auto">
                    <div>
                        <h2 className="text-base font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-amber-500" />
                            البيانات المشتركة للدفعة المستوردة
                        </h2>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            تُطبق هذه الصياغة والمناسبة المكتوبة على كافة الشهادات المستوردة.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="form-label font-bold text-slate-700 dark:text-slate-300">عنوان المناسبة / الحفل الإداري *</label>
                            <input 
                                type="text" 
                                className="form-control"
                                placeholder="مثال: حفل التميز السنوي الأول لعام 2026"
                                value={commonData.event}
                                onChange={e => setCommonData(p => ({ ...p, event: e.target.value }))} 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label font-bold text-slate-700 dark:text-slate-300">سبب التكريم والتقدير المشترك *</label>
                            <textarea 
                                rows="3" 
                                className="form-control resize-none"
                                placeholder="نظير جهودكم وتفانيكم في تطوير الأنظمة الرقمية..."
                                value={commonData.reasonText}
                                onChange={e => setCommonData(p => ({ ...p, reasonText: e.target.value }))} 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label font-bold text-slate-700 dark:text-slate-300">تاريخ التكريم المكتوب</label>
                            <input 
                                type="text" 
                                className="form-control"
                                value={commonData.date}
                                onChange={e => setCommonData(p => ({ ...p, date: e.target.value }))} 
                            />
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/40 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                                    checked={commonData.showQR}
                                    onChange={e => setCommonData(p => ({ ...p, showQR: e.target.checked }))} 
                                />
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">تضمين رمز QR للتحقق الرقمي للشهادة</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                                    checked={commonData.directSubmit}
                                    onChange={e => setCommonData(p => ({ ...p, directSubmit: e.target.checked }))} 
                                />
                                <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                                    🚀 رفع مباشرة للاعتماد (يتجاوز حالة المسودة ويذهب لدرج المراجع)
                                </span>
                            </label>
                        </div>

                        <div className="p-3 bg-amber-500/5 text-amber-500 border border-amber-500/10 rounded-xl text-[11px] font-bold">
                            📊 سيتم إدراج <strong>{names.length}</strong> شهادة متتالية في قاعدة البيانات، تبدأ بالرقم التسلسلي: <strong>{getNextSerial()}</strong>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                        <button 
                            className="py-2 px-4 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            onClick={() => setStep(2)}
                        >
                            ← رجوع
                        </button>
                        <button
                            className="flex-1 py-2.5 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 disabled:opacity-40"
                            onClick={handleGenerateSerials}
                            disabled={!commonData.event.trim() || !commonData.reasonText.trim()}
                        >
                            <span>تأكيد ومراجعة الدفعة المستخرجة</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 4: Preview & Confirm Save */}
            {step === 4 && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                        <div>
                            <h2 className="text-base font-black text-slate-900 dark:text-slate-50 flex items-center gap-2">
                                <Database className="w-5 h-5 text-amber-500" />
                                إدراج وحفظ شهادات الدفعة في النظام
                            </h2>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                سيتم إدراج الشهادات داخل قاعدة بيانات النظام (IndexedDB/local) بصفة <strong>{commonData.directSubmit ? 'معلق للاعتماد' : 'مسودات'}</strong>.
                            </p>
                        </div>

                        {saving && (
                            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-3.5 border border-slate-100 dark:border-slate-800/40">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="text-slate-500">⏳ جاري إدراج الشهادات في قاعدة البيانات...</span>
                                    <span className="text-amber-500">{saveProgress}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${saveProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {saveDone && (
                            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl space-y-3">
                                <div className="flex items-center gap-2 font-black text-sm">
                                    <CheckCircle2 className="w-5 h-5" />
                                    <span>تم إدراج الدفعة بالكامل في النظام بنجاح!</span>
                                </div>
                                <p className="text-xs leading-relaxed opacity-85">
                                    تم إدراج عدد <strong>{names.length}</strong> شهادة شكر بنجاح برقم تسلسلي موحد يبدأ بـ <strong>{serials[0]}</strong> وينتهي بـ <strong>{serials[serials.length - 1]}</strong>.
                                </p>
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => navigate('/registry')}
                                        className="py-2 px-4 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all cursor-pointer"
                                    >
                                        اذهب لسجل الشهادات
                                    </button>
                                    <button 
                                        onClick={() => navigate('/dashboard')}
                                        className="py-2 px-4 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
                                    >
                                        لوحة التحكم
                                    </button>
                                </div>
                            </div>
                        )}

                        {!saving && !saveDone && (
                            <div className="flex gap-4 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl items-center justify-between">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">مراجعة أرقام تسلسلية الدفعة والاعتمادات</h4>
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                            العدد الإجمالي: {names.length} شهادات | الحالة: {commonData.directSubmit ? 'تقديم فوري للاعتماد' : 'حفظ كمسودة للتعديل اللاحق'}.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        className="py-2 px-4 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-black cursor-pointer"
                                        onClick={() => setStep(3)}
                                    >
                                        ← تعديل الصياغة
                                    </button>
                                    <button 
                                        className="py-2 px-4 bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black shadow-md shadow-amber-500/10 cursor-pointer"
                                        onClick={handleBulkSave}
                                    >
                                        {commonData.directSubmit ? 'توليد وتقديم للاعتماد' : 'حفظ كمسودات في النظام'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Batch Preview Cards Grid */}
                    <div className="bg-white dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
                        <h3 className="text-sm font-black text-slate-800 dark:text-slate-200">
                            🔍 معاينة بطاقات الدفعة المستخرجة ({names.length})
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {names.map((item, i) => (
                                <div key={i} className="border border-slate-100 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900/40 shadow-sm">
                                    <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                                        <span>بطاقة {i + 1} من {names.length}</span>
                                        <span className="font-mono">{serials[i]}</span>
                                    </div>
                                    <div className="p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950 overflow-hidden relative" style={{ minHeight: '140px' }}>
                                        <div style={{ transform: 'scale(0.18)', transformOrigin: 'center center', width: '297mm', height: '210mm', position: 'absolute' }}>
                                            <CertificateTemplate
                                                ref={el => { certRefs.current[`cert-${i}`] = el }}
                                                template={activeTemplate}
                                                layers={layers}
                                                canvasWidth={canvasWidth}
                                                data={{
                                                    recipientName: item.name,
                                                    event: commonData.event,
                                                    date: commonData.date,
                                                    serial: serials[i],
                                                    status: commonData.directSubmit ? 'PENDING_APPROVAL' : 'DRAFT'
                                                }}
                                                settings={settings}
                                                showQR={commonData.showQR}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800/60 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                                        👤 المستفيد: {item.name}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

