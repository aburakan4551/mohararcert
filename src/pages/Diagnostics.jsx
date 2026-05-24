/**
 * 📊 Diagnostics.jsx — Internal Performance Diagnostics Dashboard
 * Wraps the StressConsole inside a standardized page template with clean layouts.
 */

import React from 'react';
import StressConsole from '../components/StressConsole';
import { Card } from '../ui/cards/Card';

export default function Diagnostics() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <StressConsole />
        </div>
    );
}
