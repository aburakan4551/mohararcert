/**
 * 🖼️ ImageProcessor.js
 * High-performance pure JavaScript image pipeline for production.
 * Handles compression, resizing, circular/rectangular cropping, and thumbnail generation.
 */
export class ImageProcessor {
    /**
     * Compress and optimize a Base64 image or File
     * @param {string|File} imageInput - Base64 data URI or File object
     * @param {Object} options - { maxWidth, maxHeight, quality, cropCircle }
     * @returns {Promise<Object>} - { optimizedBase64, thumbnailBase64, sizeBytes, originalSizeBytes }
     */
    static async processImage(imageInput, options = {}) {
        const {
            maxWidth = 800,
            maxHeight = 800,
            quality = 0.75,
            cropCircle = false
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
                try {
                    // Determine dimensions adhering to max bounds
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }

                    // 1. Create Canvas for High-res Optimized output
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    // Support circular cropping for stamp seals
                    if (cropCircle) {
                        const radius = Math.min(width, height) / 2;
                        ctx.beginPath();
                        ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
                        ctx.clip();
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const optimizedBase64 = canvas.toDataURL('image/png', quality);

                    // 2. Create Canvas for Low-res Thumbnail (max 100px)
                    const thumbCanvas = document.createElement('canvas');
                    const thumbSize = 100;
                    thumbCanvas.width = thumbSize;
                    thumbCanvas.height = thumbSize;
                    const thumbCtx = thumbCanvas.getContext('2d');

                    if (cropCircle) {
                        thumbCtx.beginPath();
                        thumbCtx.arc(thumbSize / 2, thumbSize / 2, thumbSize / 2, 0, Math.PI * 2);
                        thumbCtx.clip();
                    }
                    
                    thumbCtx.drawImage(img, 0, 0, thumbSize, thumbSize);
                    const thumbnailBase64 = thumbCanvas.toDataURL('image/png', 0.5);

                    // Calculate sizes
                    const originalSizeBytes = typeof imageInput === 'string' ? Math.round(imageInput.length * 0.75) : imageInput.size;
                    const optimizedSizeBytes = Math.round(optimizedBase64.length * 0.75);

                    resolve({
                        optimizedBase64,
                        thumbnailBase64,
                        sizeBytes: optimizedSizeBytes,
                        originalSizeBytes
                    });
                } catch (e) {
                    reject(e);
                }
            };

            img.onerror = (err) => reject(new Error("فشل في تحميل الصورة للمعالجة."));

            if (imageInput instanceof File) {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.readAsDataURL(imageInput);
            } else {
                img.src = imageInput;
            }
        });
    }
}

export default ImageProcessor;
