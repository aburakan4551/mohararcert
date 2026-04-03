import React, { useRef, useState } from 'react'
import { parseExcelFile } from '../utils/excelParser'

/**
 * Excel file importer component
 */
export default function ExcelImporter({ onImport }) {
    const inputRef = useRef()
    const [dragging, setDragging] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [preview, setPreview] = useState(null)

    const handleFile = async (file) => {
        if (!file) return
        if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
            setError('يرجى رفع ملف Excel بصيغة .xlsx أو .xls')
            return
        }
        setLoading(true)
        setError(null)
        try {
            const names = await parseExcelFile(file)
            if (names.length === 0) {
                setError('لم يتم العثور على أسماء في الملف. تأكد من وجود عمود "الاسم" أو "Name".')
                setLoading(false)
                return
            }
            setPreview(names)
            if (onImport) onImport(names)
        } catch (err) {
            setError(err.message)
        }
        setLoading(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
    }

    return (
        <div>
            <div
                className={`upload-zone${dragging ? ' dragging' : ''}`}
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                style={{ cursor: 'pointer' }}
            >
                <span className="upload-icon">📊</span>
                <p style={{ fontWeight: 600 }}>اسحب ملف Excel هنا أو اضغط للاختيار</p>
                <p style={{ fontSize: '0.82rem', color: '#aaa', marginTop: '6px' }}>
                    يدعم صيغ .xlsx و .xls — تأكد من وجود عمود باسم "الاسم" أو "Name"
                </p>
            </div>

            <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => handleFile(e.target.files[0])}
                style={{ display: 'none' }}
            />

            {loading && (
                <div className="flex-center" style={{ padding: '20px' }}>
                    <div className="loading-spinner" />
                    <span style={{ marginRight: '12px', color: 'var(--text-muted)' }}>جاري قراءة الملف...</span>
                </div>
            )}

            {error && (
                <div className="alert alert-warning" style={{ marginTop: '12px' }}>
                    ⚠️ {error}
                </div>
            )}

            {preview && !loading && (
                <div style={{ marginTop: '16px' }}>
                    <div className="alert alert-success">
                        ✅ تم قراءة <strong>{preview.length}</strong> اسم من الملف
                    </div>
                    <div className="table-wrapper" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>الاسم</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.slice(0, 20).map((item, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td>{item.name}</td>
                                    </tr>
                                ))}
                                {preview.length > 20 && (
                                    <tr>
                                        <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                            ... و {preview.length - 20} أسماء أخرى
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
