import React, { createContext, useContext, useMemo } from 'react'
import { useTemplates } from '../hooks/useTemplates'
import { useLayers } from '../hooks/useLayers'

const TemplateContext = createContext()

/**
 * TemplateProvider – Global context to manage the active template and its layers.
 * Avoids redundant hook calls and ensures consistency across Single Creation and Settings.
 */
export function TemplateProvider({ children }) {
    const templateStore = useTemplates()
    const { activeTemplateId, getTemplate } = templateStore

    // The layers hook for the GLOBAL active template
    const activeLayers = useLayers(activeTemplateId || 'default')

    const activeTemplate = useMemo(() => 
        getTemplate(activeTemplateId), 
        [activeTemplateId, getTemplate]
    )

    const value = {
        ...templateStore,
        activeTemplate,
        activeLayers, // includes layers, updateLayer, etc.
    }

    return (
        <TemplateContext.Provider value={value}>
            {children}
        </TemplateContext.Provider>
    )
}

/**
 * Custom hook to consume the Template Context
 */
export function useTemplateContext() {
    const context = useContext(TemplateContext)
    if (!context) {
        throw new Error('useTemplateContext must be used within a TemplateProvider')
    }
    return context
}
