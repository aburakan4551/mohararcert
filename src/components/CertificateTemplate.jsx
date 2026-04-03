/**
 * CertificateTemplate – thin wrapper around UnifiedCertificateEngine.
 *
 * This file is kept for backward compatibility.
 * All rendering logic lives in UnifiedCertificateEngine.
 */
import React, { forwardRef } from 'react'
import UnifiedCertificateEngine from '../engine/UnifiedCertificateEngine'

const CertificateTemplate = forwardRef(function CertificateTemplate(
    { data = {}, settings = {}, template = null, layers = null, canvasWidth = 800, showQR = true },
    ref
) {
    return (
        <UnifiedCertificateEngine
            ref={ref}
            mode="preview"
            template={template}
            layers={layers || []}
            canvasWidth={canvasWidth}
            data={data}
            settings={settings}
            showQR={showQR}
        />
    )
})

export default CertificateTemplate
