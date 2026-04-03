import { useLocalStorage } from './useLocalStorage'

const DEFAULT_SERIAL_START = 202600002

export function useSerial() {
    const [serialSettings, setSerialSettings] = useLocalStorage('serialSettings', {
        prefix: '',
        currentNumber: DEFAULT_SERIAL_START,
        startNumber: DEFAULT_SERIAL_START,
        usedSerials: []
    })

    const getNextSerial = () => {
        const { prefix, currentNumber, usedSerials } = serialSettings
        let next = currentNumber
        // skip any duplicates
        while (usedSerials.includes(next)) {
            next++
        }
        const serialStr = prefix ? `${prefix}-${next}` : `${next}`
        return serialStr
    }

    const consumeSerial = () => {
        const { prefix, currentNumber, usedSerials } = serialSettings
        let next = currentNumber
        while (usedSerials.includes(next)) {
            next++
        }
        const serialStr = prefix ? `${prefix}-${next}` : `${next}`
        setSerialSettings(prev => ({
            ...prev,
            currentNumber: next + 1,
            usedSerials: [...prev.usedSerials, next]
        }))
        return serialStr
    }

    const consumeMultiple = (count) => {
        const results = []
        const { prefix, currentNumber, usedSerials } = serialSettings
        let next = currentNumber
        const newUsed = [...usedSerials]
        for (let i = 0; i < count; i++) {
            while (newUsed.includes(next)) next++
            const serialStr = prefix ? `${prefix}-${next}` : `${next}`
            results.push(serialStr)
            newUsed.push(next)
            next++
        }
        setSerialSettings(prev => ({
            ...prev,
            currentNumber: next,
            usedSerials: newUsed
        }))
        return results
    }

    const resetSerial = (newStart = DEFAULT_SERIAL_START) => {
        setSerialSettings(prev => ({
            ...prev,
            currentNumber: newStart,
            startNumber: newStart,
            usedSerials: []
        }))
    }

    const updateSettings = (updates) => {
        setSerialSettings(prev => ({ ...prev, ...updates }))
    }

    return {
        serialSettings,
        getNextSerial,
        consumeSerial,
        consumeMultiple,
        resetSerial,
        updateSettings
    }
}
