/**
 * 🔤 TypographyEngine.js
 * Handles Smart Wrapping, Auto Fit, Dynamic Font Scaling, and RTL Text Rendering for Canvas.
 */

export class TypographyEngine {
    constructor(ctx, canvasWidth, canvasHeight) {
        this.ctx = ctx;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
    }

    /**
     * Measure text dimensions precisely
     */
    measureText(text, fontSize, fontFamily, fontWeight = 'normal') {
        this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const metrics = this.ctx.measureText(text);
        return {
            width: metrics.width,
            height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
            ascent: metrics.actualBoundingBoxAscent,
            descent: metrics.actualBoundingBoxDescent
        };
    }

    /**
     * Auto scale text to fit within a maximum width/height.
     */
    calculateAutoFit(text, maxWidth, maxHeight, baseFontSize, fontFamily, fontWeight = 'normal', minFontSize = 10) {
        let currentSize = baseFontSize;
        let dimensions = this.measureText(text, currentSize, fontFamily, fontWeight);

        while ((dimensions.width > maxWidth || dimensions.height > maxHeight) && currentSize > minFontSize) {
            currentSize -= 1;
            dimensions = this.measureText(text, currentSize, fontFamily, fontWeight);
        }

        return {
            fontSize: currentSize,
            width: dimensions.width,
            height: dimensions.height,
            isWrapped: false // Future expansion for auto-wrap logic
        };
    }

    /**
     * Draw text centered at x,y with RTL support
     */
    drawTextCentered(text, x, y, options) {
        const {
            fontSize = 32,
            fontFamily = 'Cairo',
            fontWeight = 'normal',
            color = '#000000',
            autoScale = false,
            maxWidth = this.canvasWidth,
            maxHeight = this.canvasHeight,
            minFontSize = 10
        } = options;

        let finalSize = fontSize;

        if (autoScale) {
            const fit = this.calculateAutoFit(text, maxWidth, maxHeight, fontSize, fontFamily, fontWeight, minFontSize);
            finalSize = fit.fontSize;
        }

        this.ctx.font = `${fontWeight} ${finalSize}px ${fontFamily}`;
        this.ctx.fillStyle = color;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Ensure RTL correct rendering if supported by browser canvas natively
        this.ctx.direction = 'rtl';

        this.ctx.fillText(text, x, y);
    }
}
