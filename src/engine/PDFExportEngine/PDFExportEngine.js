/**
 * 🖨️ PDFExportEngine.js
 * High-resolution Print-safe PDF Exporter that strictly preserves RTL, fonts, and layout.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export class PDFExportEngine {
    
    /**
     * Exports a DOM element as a high-quality PDF.
     * @param {HTMLElement} element - The node to capture (TemplateRenderer wrapper).
     * @param {Object} options - Export options (filename, etc).
     */
    static async exportElement(element, options = {}) {
        const { filename = 'شهادة_شكر.pdf', quality = 3 } = options;

        if (!element) throw new Error("Element not provided for PDF export");

        try {
            // Temporarily disable rounded corners/shadows for a flat print
            const originalBoxShadow = element.style.boxShadow;
            const originalBorderRadius = element.style.borderRadius;
            
            element.style.boxShadow = 'none';
            element.style.borderRadius = '0';

            const canvas = await html2canvas(element, {
                scale: quality, // 3x scale for high resolution
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (documentClone) => {
                    // Ensure fonts are fully loaded in the clone
                    documentClone.fonts.ready.then(() => {});
                }
            });

            // Restore styles
            element.style.boxShadow = originalBoxShadow;
            element.style.borderRadius = originalBorderRadius;

            const imgData = canvas.toDataURL('image/png', 1.0);

            // A4 landscape dimensions (297mm x 210mm)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, '', 'FAST');
            pdf.save(filename);
            
            return true;
        } catch (error) {
            console.error("PDF Export Error: ", error);
            throw error;
        }
    }
}
