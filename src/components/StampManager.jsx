import React from 'react'
import SignatureUploader from './SignatureUploader'
import { STAMP_PRESETS } from '../config/assetPresets'

/**
 * Stamp Manager - controls stamp upload, presets, size, opacity, and rotation.
 */
export default function StampManager({ settings, onSettingsChange }) {
    const { stamp, stampSize = 120, stampOpacity = 0.85, stampRotation = -8 } = settings

    const update = (key, value) => {
        onSettingsChange({ ...settings, [key]: value })
    }

    return (
        <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-title">الختم الرسمي</div>

            <SignatureUploader
                label="صورة الختم"
                value={stamp}
                onChange={(v) => update('stamp', v)}
                hint="PNG بخلفية شفافة - الختم سيظهر في وسط أسفل الشهادة"
                presets={STAMP_PRESETS}
            />

            {stamp && (
                <>
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '20px',
                            background: 'repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            border: '1px solid var(--border)',
                        }}
                    >
                        <img
                            src={stamp}
                            alt="معاينة الختم"
                            style={{
                                width: `${stampSize}px`,
                                opacity: stampOpacity,
                                transform: `rotate(${stampRotation}deg)`,
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">الحجم: {stampSize}px</label>
                        <div className="slider-group">
                            <span style={{ fontSize: '0.8rem' }}>60px</span>
                            <input
                                type="range"
                                min="60"
                                max="250"
                                value={stampSize}
                                onChange={(e) => update('stampSize', parseInt(e.target.value, 10))}
                                style={{ flex: 1, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>250px</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">الشفافية: {Math.round(stampOpacity * 100)}%</label>
                        <div className="slider-group">
                            <span style={{ fontSize: '0.8rem' }}>20%</span>
                            <input
                                type="range"
                                min="0.2"
                                max="1"
                                step="0.05"
                                value={stampOpacity}
                                onChange={(e) => update('stampOpacity', parseFloat(e.target.value))}
                                style={{ flex: 1, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>100%</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">زاوية التدوير: {stampRotation}°</label>
                        <div className="slider-group">
                            <span style={{ fontSize: '0.8rem' }}>-45°</span>
                            <input
                                type="range"
                                min="-45"
                                max="45"
                                value={stampRotation}
                                onChange={(e) => update('stampRotation', parseInt(e.target.value, 10))}
                                style={{ flex: 1, accentColor: 'var(--primary)' }}
                            />
                            <span style={{ fontSize: '0.8rem' }}>+45°</span>
                        </div>
                    </div>

                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                            update('stampSize', 120)
                            update('stampOpacity', 0.85)
                            update('stampRotation', -8)
                        }}
                        type="button"
                    >
                        إعادة ضبط الختم
                    </button>
                </>
            )}
        </div>
    )
}
