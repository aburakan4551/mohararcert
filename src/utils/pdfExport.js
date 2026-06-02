/**
 * pdfExport.js
 *
 * All exports go through captureCleanCanvas() which:
 *  1. Clones the certificate element (class: certificate-wrapper)
 *  2. Places it in an off-screen container with natural A4 dimensions
 *  3. Strips any CSS transform / scale that the preview adds
 *  4. Captures with html2canvas at 3× scale (~300 DPI)
 *  5. Embeds the result in a jsPDF A4-landscape document
 *
 * This guarantees that print == preview == PDF regardless of the
 * browser zoom level or the on-screen scale factor.
 */
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const A4_PORTRAIT_W_MM  = 210
const A4_PORTRAIT_H_MM  = 297
const A4_LANDSCAPE_W_MM = 297
const A4_LANDSCAPE_H_MM = 210

/**
 * Resolves orientation from element's data-orientation attribute or its child.
 * Defaults to 'portrait' for backward compatibility with old templates.
 */
function resolveOrientation(element) {
    const attr = element.dataset?.orientation
        || element.querySelector('[data-orientation]')?.dataset?.orientation
        || 'portrait'
    return attr === 'landscape' ? 'landscape' : 'portrait'
}

/**
 * captureCleanCanvas
 *
 * Creates an off-screen, unscaled copy of the certificate element,
 * captures it at 3× resolution, then tears down the clone.
 *
 * @param {HTMLElement} originalElement  – the .certificate-wrapper node
 * @returns {Promise<HTMLCanvasElement>}
 */
async function captureCleanCanvas(originalElement) {
    const orientation = resolveOrientation(originalElement)
    const isPortrait = orientation === 'portrait'
    const cssW = isPortrait ? '210mm' : '297mm'
    const cssH = isPortrait ? '297mm' : '210mm'

    const wrapper = document.createElement('div')
    wrapper.style.cssText = [
        'position:fixed',
        'top:-9999px',
        'left:-9999px',
        `width:${cssW}`,
        `height:${cssH}`,
        'background:#fff',
        'overflow:hidden',
        'direction:rtl',
    ].join(';')

    // Deep clone preserves inline styles, images (base64), etc.
    const clone = originalElement.cloneNode(true)
    // Remove any scale/transform that the preview wrapper may have added
    clone.style.transform = 'none'
    clone.style.margin = '0'
    clone.style.width = cssW
    clone.style.height = cssH

    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    try {
        return await html2canvas(clone, {
            scale: 3,       // ≈ 300 DPI at 96 dpi screen
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
        })
    } finally {
        document.body.removeChild(wrapper)
    }
}

/** Build a jsPDF from a canvas and save */
function canvasToPDF(canvas, filename, orientation = 'portrait') {
    const isPortrait = orientation === 'portrait'
    const w = isPortrait ? A4_PORTRAIT_W_MM : A4_LANDSCAPE_W_MM
    const h = isPortrait ? A4_PORTRAIT_H_MM : A4_LANDSCAPE_H_MM
    const imgData = canvas.toDataURL('image/jpeg', 0.98)
    const pdf = new jsPDF({ orientation: isPortrait ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' })
    pdf.addImage(imgData, 'JPEG', 0, 0, w, h)
    pdf.save(filename)
}

/* ──────────────────────────────────────────────────────────────── */

/**
 * Export a single certificate element to PDF.
 * @param {HTMLElement} element  – .certificate-wrapper DOM node
 * @param {string}      filename
 */
export async function exportSinglePDF(element, filename = 'شهادة.pdf') {
    const orientation = resolveOrientation(element)
    const canvas = await captureCleanCanvas(element)
    canvasToPDF(canvas, filename, orientation)
}

/**
 * Export multiple certificate elements into one merged PDF.
 * @param {HTMLElement[]} elements
 * @param {string}        filename
 * @param {Function}      onProgress  – (done, total) => void
 */
export async function exportMergedPDF(elements, filename = 'شهادات.pdf', onProgress) {
    // Use orientation from the first valid element
    const firstEl = elements.find(Boolean)
    const orientation = firstEl ? resolveOrientation(firstEl) : 'portrait'
    const isPortrait = orientation === 'portrait'
    const w = isPortrait ? A4_PORTRAIT_W_MM : A4_LANDSCAPE_W_MM
    const h = isPortrait ? A4_PORTRAIT_H_MM : A4_LANDSCAPE_H_MM

    const pdf = new jsPDF({ orientation: isPortrait ? 'portrait' : 'landscape', unit: 'mm', format: 'a4' })

    for (let i = 0; i < elements.length; i++) {
        const el = elements[i]
        if (!el) continue
        const canvas = await captureCleanCanvas(el)
        const imgData = canvas.toDataURL('image/jpeg', 0.95)
        if (i > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, 0, w, h)
        onProgress?.(i + 1, elements.length)
    }
    pdf.save(filename)
}

/**
 * Export multiple certificates as individual PDF files.
 * @param {Array<{element, name, serial}>} items
 * @param {Function} onProgress
 */
export async function exportSeparatePDFs(items, onProgress) {
    for (let i = 0; i < items.length; i++) {
        const { element, name, serial } = items[i]
        if (!element) continue
        const orientation = resolveOrientation(element)
        const canvas = await captureCleanCanvas(element)
        canvasToPDF(canvas, `شهادة-${name || serial || i + 1}.pdf`, orientation)
        onProgress?.(i + 1, items.length)
        // Brief pause to avoid overwhelming the browser
        await new Promise(r => setTimeout(r, 300))
    }
}

/**
 * printElements – open a clean popup window and print one or more
 * certificate elements with zero CSS transform or scaling.
 *
 * @param {HTMLElement[]} elements  – array of .certificate-wrapper nodes
 * @param {string}        title
 */
export function printElements(elements, title = 'طباعة الشهادة') {
    // Determine orientation from first valid element
    const firstEl = elements.find(Boolean)
    const orientation = firstEl ? resolveOrientation(firstEl) : 'portrait'
    const isPortrait = orientation === 'portrait'
    const pageSize = isPortrait ? 'A4 portrait' : 'A4 landscape'
    const cssW = isPortrait ? '210mm' : '297mm'
    const cssH = isPortrait ? '297mm' : '210mm'

    const printContent = elements
        .filter(Boolean)
        .map(el => el.outerHTML)
        .join('<div style="page-break-after:always"></div>')

    const w = window.open('', '_blank', 'width=1200,height=800')
    w.document.write(`
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&family=Amiri:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
          <style>
            @page { size: ${pageSize}; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: 'Cairo', sans-serif;
              direction: rtl;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .certificate-a4,
            .certificate-wrapper {
              width: ${cssW} !important;
              height: ${cssH} !important;
              position: relative !important;
              overflow: hidden !important;
              transform: none !important;
              page-break-after: always;
            }
          </style>
        </head>
        <body>${printContent}</body>
        </html>
    `)
    w.document.close()
    // Wait for fonts and base64 images to render
    setTimeout(() => { w.focus(); w.print() }, 900)
}
