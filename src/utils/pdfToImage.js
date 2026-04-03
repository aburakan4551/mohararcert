/**
 * pdfToImage.js
 * Converts the first page of a PDF file to a high-resolution data URL image
 * using pdfjs-dist rendered onto an off-screen canvas.
 */

import * as pdfjsLib from 'pdfjs-dist'

// Set the worker source using Vite's URL resolution
// Falls back to CDN if the local worker is not available
try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).href
} catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.9.155/pdf.worker.min.mjs`
}

/**
 * Convert the first page of a PDF ArrayBuffer to a base64 PNG data URL.
 * @param {ArrayBuffer} arrayBuffer - Raw PDF file bytes
 * @param {number} scale - Render scale (2 = 2× viewport, good for quality)
 * @returns {Promise<string>} base64 PNG data URL
 */
export async function pdfPageToDataURL(arrayBuffer, scale = 2.5) {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdfDoc = await loadingTask.promise

    // Get first page
    const page = await pdfDoc.getPage(1)

    // A4 landscape viewport at 96dpi
    const viewport = page.getViewport({ scale })

    // Off-screen canvas
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')

    // White background
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Render PDF page
    const renderContext = {
        canvasContext: ctx,
        viewport,
    }

    await page.render(renderContext).promise

    return canvas.toDataURL('image/png', 1.0)
}

/**
 * Read a File object as an ArrayBuffer
 */
export function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsArrayBuffer(file)
    })
}

/**
 * Read a File object as a base64 Data URL directly (for PNG/JPG images)
 */
export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}
