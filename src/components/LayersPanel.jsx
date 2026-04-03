import React from 'react'

/**
 * LayersPanel – Photoshop-style layers list.
 *
 * Props:
 *   layers        – array of layer objects
 *   selectedId    – current selected layer id
 *   onSelect      – (id) => void
 *   onToggleVisibility – (id) => void
 *   onToggleLock  – (id) => void
 *   onDelete      – (id) => void
 *   onDuplicate   – (id) => void
 *   onBringForward – (id) => void
 *   onSendBackward – (id) => void
 *   onAddLayer    – (type) => void
 */
export default function LayersPanel({
    layers,
    selectedId,
    onSelect,
    onToggleVisibility,
    onToggleLock,
    onDelete,
    onDuplicate,
    onBringForward,
    onSendBackward,
    onAddLayer,
}) {
    // Display sorted by zIndex descending (top layers first)
    const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex)

    const typeIcons = {
        text: '📝',
        image: '🖼️',
        qr: '📱',
        shape: '◼️',
    }

    return (
        <div className="layers-panel">
            {/* Header */}
            <div className="layers-panel-header">
                <span>🗂️ الطبقات</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                    {layers.length}
                </span>
            </div>

            {/* Add layer buttons */}
            <div className="layers-add-bar">
                <button onClick={() => onAddLayer('text')} title="نص جديد">📝</button>
                <button onClick={() => onAddLayer('image')} title="صورة">🖼️</button>
                <button onClick={() => onAddLayer('shape')} title="شكل">◼️</button>
                <button onClick={() => onAddLayer('qr')} title="QR">📱</button>
            </div>

            {/* Layers list */}
            <div className="layers-list">
                {sorted.map(layer => {
                    const isSelected = layer.id === selectedId
                    return (
                        <div
                            key={layer.id}
                            className={`layer-item${isSelected ? ' selected' : ''}`}
                            onClick={() => onSelect(layer.id)}
                        >
                            {/* Visibility toggle */}
                            <button
                                className="layer-btn"
                                onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id) }}
                                title={layer.visible ? 'إخفاء' : 'إظهار'}
                                style={{ opacity: layer.visible ? 1 : 0.3 }}
                            >
                                {layer.visible ? '👁' : '👁‍🗨'}
                            </button>

                            {/* Lock toggle */}
                            <button
                                className="layer-btn"
                                onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id) }}
                                title={layer.locked ? 'فك القفل' : 'قفل'}
                            >
                                {layer.locked ? '🔒' : '🔓'}
                            </button>

                            {/* Type icon + label */}
                            <div className="layer-info">
                                <span className="layer-type-icon">{typeIcons[layer.type] || '❓'}</span>
                                <span className="layer-label">{layer.label}</span>
                            </div>

                            {/* Z-index indicator */}
                            <span className="layer-z">{layer.zIndex}</span>

                            {/* Actions */}
                            {isSelected && (
                                <div className="layer-actions">
                                    <button className="layer-btn" onClick={(e) => { e.stopPropagation(); onBringForward(layer.id) }} title="للأمام">⬆️</button>
                                    <button className="layer-btn" onClick={(e) => { e.stopPropagation(); onSendBackward(layer.id) }} title="للخلف">⬇️</button>
                                    <button className="layer-btn" onClick={(e) => { e.stopPropagation(); onDuplicate(layer.id) }} title="تكرار">📋</button>
                                    <button className="layer-btn danger" onClick={(e) => { e.stopPropagation(); onDelete(layer.id) }} title="حذف">🗑️</button>
                                </div>
                            )}
                        </div>
                    )
                })}

                {layers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem' }}>
                        لا توجد طبقات
                    </div>
                )}
            </div>
        </div>
    )
}
