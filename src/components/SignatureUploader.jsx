import React, { useRef, useState } from 'react'

/**
 * Reusable image uploader for signatures/stamps
 * props:
 *   label - Arabic label
 *   value - current image data URL
 *   onChange - callback(dataURL)
 *   hint - optional note
 *   accept - file types (default: image/png,image/jpeg)
 */
export default function SignatureUploader({
    label = 'رفع صورة',
    value = null,
    onChange,
    hint = 'PNG بخلفية شفافة (موصى به)',
    accept = 'image/png,image/jpeg,image/jpg'
}) {
    const inputRef = useRef()
    const [dragging, setDragging] = useState(false)

    const handleFile = (file) => {
        if (!file) return
        const reader = new FileReader()
        reader.onload = (e) => {
            if (onChange) onChange(e.target.result)
        }
        reader.readAsDataURL(file)
    }

    const handleChange = (e) => {
        handleFile(e.target.files[0])
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        handleFile(file)
    }

    const handleRemove = () => {
        if (onChange) onChange(null)
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div style={{ marginBottom: '16px' }}>
            <label className="form-label">{label}</label>

            {value ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '8px',
                        background: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 12px 12px'
                    }}>
                        <img
                            src={value}
                            alt={label}
                            style={{ maxWidth: '160px', maxHeight: '80px', objectFit: 'contain', display: 'block' }}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <button
                            className="btn btn-outline btn-sm"
                            onClick={() => inputRef.current?.click()}
                            type="button"
                        >
                            🔄 تغيير
                        </button>
                        <button
                            className="btn btn-danger btn-sm"
                            onClick={handleRemove}
                            type="button"
                        >
                            🗑️ حذف
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className={`upload-zone${dragging ? ' dragging' : ''}`}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                >
                    <span className="upload-icon">📎</span>
                    <p>اسحب الصورة هنا أو اضغط للاختيار</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px', color: '#aaa' }}>{hint}</p>
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={accept}
                onChange={handleChange}
                style={{ display: 'none' }}
            />
        </div>
    )
}
