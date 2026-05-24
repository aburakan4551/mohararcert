/**
 * 🖨️ ExportEngine.jsx
 * Headless Off-screen PDF & PNG Export Engine for Production.
 * Decoupled from active UI, supports background multi-page renders, batch exports, and loading feedback.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import TemplateRenderer from '../TemplateRenderer/TemplateRenderer';

export class ExportEngine {
    /**
     * Headless off-screen export of a certificate as PDF or PNG.
     * @param {Object} template - Smart Template object
     * @param {Object} dataContext - Merged dynamic variable contexts
     * @param {Object} settings - Snapped or current organization settings
     * @param {Object} options - { filename, format: 'pdf'|'png', progressCallback }
     */
    static async exportHeadless(template, dataContext, settings, options = {}) {
        const {
            filename = 'وثيقة_رسمية.pdf',
            format = 'pdf',
            progressCallback = () => {}
        } = options;

        if (!template) throw new Error("قالب التصميم غير متوفر للتصدير");

        // 1. Create a detached off-screen DOM container
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'absolute';
        offscreenContainer.style.left = '-9999px';
        offscreenContainer.style.top = '-9999px';
        offscreenContainer.style.width = '1122.5px'; // Base landscape A4
        offscreenContainer.style.height = '793.7px';
        offscreenContainer.style.background = '#ffffff';
        document.body.appendChild(offscreenContainer);

        progressCallback(10);
        let root = null;

        try {
            // 2. Programmatically mount TemplateRenderer in virtual DOM
            root = createRoot(offscreenContainer);
            
            // Support multi-page templates schema if present
            const pages = template.pages || [{ pageNum: 1, ...template }];
            const pdf = format === 'pdf' ? new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            }) : null;

            for (let i = 0; i < pages.length; i++) {
                const pageTpl = {
                    ...template,
                    backgroundUrl: pages[i].backgroundUrl || template.backgroundUrl,
                    fields: pages[i].fields || template.fields || []
                };

                progressCallback(20 + Math.round((i / pages.length) * 40));

                // Mount offscreen
                await new Promise((resolve) => {
                    root.render(
                        <TemplateRenderer 
                            template={pageTpl} 
                            dataContext={dataContext} 
                            width={1122.5} 
                            settings={settings}
                        />
                    );
                    // Give Vite and images breathing room to resolve
                    setTimeout(resolve, 800);
                });

                // Wait for all img elements in container to finish loading
                const images = offscreenContainer.querySelectorAll('img');
                await Promise.all(
                    Array.from(images).map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(res => {
                            img.onload = res;
                            img.onerror = res;
                        });
                    })
                );

                progressCallback(60 + Math.round((i / pages.length) * 20));

                // Capture high-resolution offscreen canvas (3x scale)
                const canvas = await html2canvas(offscreenContainer, {
                    scale: 3,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                if (format === 'png') {
                    // PNG Export
                    const imgData = canvas.toDataURL('image/png', 1.0);
                    const link = document.createElement('a');
                    link.download = filename.replace('.pdf', '.png');
                    link.href = imgData;
                    link.click();
                    
                    // GC Cleanup
                    canvas.width = 0;
                    canvas.height = 0;
                    root.unmount();
                    document.body.removeChild(offscreenContainer);
                    progressCallback(100);
                    return true;
                }

                // PDF multi-page appending
                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, '', 'FAST');

                // GC Cleanup
                canvas.width = 0;
                canvas.height = 0;
            }

            // Save PDF File
            pdf.save(filename);
            
            // Cleanup Root & Node
            root.unmount();
            document.body.removeChild(offscreenContainer);
            progressCallback(100);
            return true;
        } catch (err) {
            // Ensure DOM cleanup and React unmount even on crash to prevent memory leaks
            try {
                if (root) {
                    root.unmount();
                }
            } catch (unmountErr) {
                console.error("Failed to unmount Virtual DOM root on error path: ", unmountErr);
            }
            if (document.body.contains(offscreenContainer)) {
                document.body.removeChild(offscreenContainer);
            }
            throw err;
        }
    }
}

export default ExportEngine;
