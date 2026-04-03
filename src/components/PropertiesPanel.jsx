import React from 'react'

const FONT_OPTIONS = [
    { value: 'Cairo', label: 'كايرو' },
    { value: 'Amiri', label: 'أميري' },
    { value: 'Arial', label: 'Arial' },
    { value: 'monospace', label: 'Monospace' },
]

const ALIGN_OPTIONS = [
    { value: 'right', label: 'يمين', icon: '◀' },
    { value: 'center', label: 'وسط', icon: '⏺' },
    { value: 'left', label: 'يسار', icon: '▶' },
]

/**
 * PropertiesPanel – property inspector for the selected layer.
 *
 * Props:
 *   layer           – the selected layer object (or null)
 *   onUpdate        – (id, updates) => void
 *   onUpdateStyle   – (id, styleUpdates) => void
 *   onAlign         – (id, alignment) => void
 */
export default function PropertiesPanel({
    layer,
    onUpdate,
    onUpdateStyle,
    onAlign,
}) {
    if (!layer) {
        return (
            <div className="props-panel">
                <div className="props-panel-header">⚙️ الخصائص</div>
                <div style={{ padding: '32px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                    اختر طبقة لتعديل خصائصها
                </div>
            </div>
        )
    }

    const s = layer.style || {}

    return (
        <div className="props-panel">
            <div className="props-panel-header">
                ⚙️ {layer.label}
            </div>

            <div className="props-section">
                {/* Label */}
                <div className="prop-row">
                    <label className="prop-label">التسمية</label>
                    <input
                        className="prop-input"
                        value={layer.label}
                        onChange={e => onUpdate(layer.id, { label: e.target.value })}
                    />
                </div>

                {/* Position */}
                <div className="prop-row-double">
                    <div>
                        <label className="prop-label">X %</label>
                        <input
                            className="prop-input"
                            type="number" min="0" max="100" step="1"
                            value={Math.round(layer.x)}
                            onChange={e => onUpdate(layer.id, { x: +e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="prop-label">Y %</label>
                        <input
                            className="prop-input"
                            type="number" min="0" max="100" step="1"
                            value={Math.round(layer.y)}
                            onChange={e => onUpdate(layer.id, { y: +e.target.value })}
                        />
                    </div>
                </div>

                {/* Size */}
                <div className="prop-row-double">
                    <div>
                        <label className="prop-label">عرض</label>
                        <input
                            className="prop-input"
                            type="number" min="20" step="5"
                            value={layer.width}
                            onChange={e => onUpdate(layer.id, { width: +e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="prop-label">ارتفاع</label>
                        <input
                            className="prop-input"
                            type="number" min="20" step="5"
                            value={layer.height}
                            onChange={e => onUpdate(layer.id, { height: +e.target.value })}
                        />
                    </div>
                </div>

                {/* Alignment */}
                <div className="prop-row">
                    <label className="prop-label">محاذاة</label>
                    <div className="prop-align-bar">
                        <button onClick={() => onAlign(layer.id, 'left')} title="يسار">◀</button>
                        <button onClick={() => onAlign(layer.id, 'center-h')} title="وسط أفقي">↔</button>
                        <button onClick={() => onAlign(layer.id, 'right')} title="يمين">▶</button>
                        <span style={{ width: '1px', background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
                        <button onClick={() => onAlign(layer.id, 'top')} title="أعلى">▲</button>
                        <button onClick={() => onAlign(layer.id, 'center-v')} title="وسط عمودي">↕</button>
                        <button onClick={() => onAlign(layer.id, 'bottom')} title="أسفل">▼</button>
                    </div>
                </div>
            </div>

            {/* ── Text-specific properties ── */}
            {layer.type === 'text' && (
                <div className="props-section">
                    <div className="props-section-title">🔤 نص</div>

                    <div className="prop-row">
                        <label className="prop-label">حجم الخط</label>
                        <input
                            className="prop-input"
                            type="number" min="8" max="120" step="1"
                            value={s.fontSize || 16}
                            onChange={e => onUpdateStyle(layer.id, { fontSize: +e.target.value })}
                        />
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">الوزن</label>
                        <select
                            className="prop-input"
                            value={s.fontWeight || 'normal'}
                            onChange={e => onUpdateStyle(layer.id, { fontWeight: e.target.value })}
                        >
                            <option value="400">عادي</option>
                            <option value="600">متوسط</option>
                            <option value="700">عريض</option>
                            <option value="800">سميك</option>
                            <option value="900">أسود</option>
                        </select>
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">الخط</label>
                        <select
                            className="prop-input"
                            value={s.fontFamily || 'Cairo'}
                            onChange={e => onUpdateStyle(layer.id, { fontFamily: e.target.value })}
                        >
                            {FONT_OPTIONS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">اللون</label>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <input
                                type="color"
                                value={s.color || '#000000'}
                                onChange={e => onUpdateStyle(layer.id, { color: e.target.value })}
                                style={{ width: '32px', height: '28px', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: 0 }}
                            />
                            <input
                                className="prop-input"
                                value={s.color || '#000000'}
                                onChange={e => onUpdateStyle(layer.id, { color: e.target.value })}
                                style={{ flex: 1 }}
                            />
                        </div>
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">المحاذاة</label>
                        <div className="prop-align-bar">
                            {ALIGN_OPTIONS.map(a => (
                                <button
                                    key={a.value}
                                    onClick={() => onUpdateStyle(layer.id, { textAlign: a.value })}
                                    style={{
                                        background: s.textAlign === a.value ? 'rgba(201,162,39,0.4)' : 'transparent',
                                    }}
                                    title={a.label}
                                >{a.icon}</button>
                            ))}
                        </div>
                    </div>

                    {/* ── Data Binding ── */}
                    <div className="prop-row" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '4px' }}>
                        <label className="prop-label" style={{ color: '#c9a227', fontWeight: 700 }}>
                            🔗 ربط بيانات
                        </label>
                        <select
                            className="prop-input"
                            value={layer.dataKey || ''}
                            onChange={e => {
                                const v = e.target.value
                                onUpdate(layer.id, { dataKey: v || undefined })
                            }}
                            title="اختر مفتاح البيانات لعرضه ديناميكياً في صفحة الإنشاء"
                            style={{ borderColor: layer.dataKey ? '#c9a227' : undefined }}
                        >
                            <option value="">— نص ثابت (من التسمية) —</option>
                            <option value="name">👤 اسم المستفيد</option>
                            <option value="event">📌 عنوان المناسبة</option>
                            <option value="date">📅 التاريخ</option>
                            <option value="serial">🔢 الرقم التسلسلي</option>
                            <option value="reason">📝 السبب / النص الطويل</option>
                            <option value="director-name">🪪 اسم المدير</option>
                            <option value="visa-name">✍️ اسم التأشيرة</option>
                        </select>
                        {layer.dataKey && (
                            <div style={{ fontSize: '0.7rem', color: 'rgba(201,162,39,0.7)', marginTop: '4px' }}>
                                ✅ هذه الطبقة تعرض بيانات ديناميكية من نموذج الإنشاء
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Image-specific properties ── */}
            {layer.type === 'image' && (
                <div className="props-section">
                    <div className="props-section-title">🖼️ صورة</div>

                    <div className="prop-row">
                        <label className="prop-label">شفافية</label>
                        <input
                            type="range" min="0" max="1" step="0.05"
                            value={s.opacity ?? 1}
                            onChange={e => onUpdateStyle(layer.id, { opacity: +e.target.value })}
                            style={{ width: '100%' }}
                        />
                        <span className="prop-value">{Math.round((s.opacity ?? 1) * 100)}%</span>
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">تدوير</label>
                        <input
                            type="range" min="-45" max="45" step="1"
                            value={s.rotation || 0}
                            onChange={e => onUpdateStyle(layer.id, { rotation: +e.target.value })}
                            style={{ width: '100%' }}
                        />
                        <span className="prop-value">{s.rotation || 0}°</span>
                    </div>
                </div>
            )}

            {/* ── Shape-specific properties ── */}
            {layer.type === 'shape' && (
                <div className="props-section">
                    <div className="props-section-title">◼️ شكل</div>

                    <div className="prop-row">
                        <label className="prop-label">لون التعبئة</label>
                        <input
                            type="color"
                            value={s.fill || '#c9a227'}
                            onChange={e => onUpdateStyle(layer.id, { fill: e.target.value })}
                            style={{ width: '100%', height: '30px', border: 'none', borderRadius: '4px' }}
                        />
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">لون الحد</label>
                        <input
                            type="color"
                            value={s.borderColor || '#c9a227'}
                            onChange={e => onUpdateStyle(layer.id, { borderColor: e.target.value })}
                            style={{ width: '100%', height: '30px', border: 'none', borderRadius: '4px' }}
                        />
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">سمك الحد</label>
                        <input
                            className="prop-input"
                            type="number" min="0" max="10" step="1"
                            value={s.borderWidth || 1}
                            onChange={e => onUpdateStyle(layer.id, { borderWidth: +e.target.value })}
                        />
                    </div>

                    <div className="prop-row">
                        <label className="prop-label">زاوية الحد</label>
                        <input
                            className="prop-input"
                            type="text"
                            placeholder="مثال: 8px"
                            value={s.borderRadius || '0'}
                            onChange={e => onUpdateStyle(layer.id, { borderRadius: e.target.value })}
                        />
                    </div>
                </div>
            )}

            {/* Z-Index */}
            <div className="props-section">
                <div className="prop-row">
                    <label className="prop-label">الترتيب (Z)</label>
                    <input
                        className="prop-input"
                        type="number" min="0" max="100" step="1"
                        value={layer.zIndex}
                        onChange={e => onUpdate(layer.id, { zIndex: +e.target.value })}
                    />
                </div>
            </div>
        </div>
    )
}
