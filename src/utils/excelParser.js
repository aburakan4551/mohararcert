import * as XLSX from 'xlsx'

/**
 * Parse an Excel file and return an array of names from the first column
 * @param {File} file - the uploaded Excel file
 * @returns {Promise<Array>} - Array of objects with name and row data
 */
export async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const sheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

                // Find name and prefix columns (look for header row with 'اسم'/'name' and 'اللقب'/'prefix')
                let nameColIndex = 0
                let prefixColIndex = -1
                if (jsonData.length > 0) {
                    const header = jsonData[0].map(h => (h || '').toString().toLowerCase().trim())
                    const nameIdx = header.findIndex(h =>
                        h.includes('اسم') || h.includes('name') || h.includes('الاسم')
                    )
                    if (nameIdx !== -1) nameColIndex = nameIdx

                    const prefixIdx = header.findIndex(h =>
                        h.includes('اللقب') || h.includes('لقب') || h.includes('prefix') || h.includes('title')
                    )
                    if (prefixIdx !== -1) prefixColIndex = prefixIdx
                }

                // Extract names (skip header row if detected)
                const startRow = jsonData[0] && typeof jsonData[0][nameColIndex] === 'string' &&
                    (jsonData[0][nameColIndex].includes('اسم') || jsonData[0][nameColIndex].toLowerCase().includes('name'))
                    ? 1 : 0

                const names = []
                for (let i = startRow; i < jsonData.length; i++) {
                    const row = jsonData[i]
                    if (row && row[nameColIndex]) {
                        const name = row[nameColIndex].toString().trim()
                        if (name) {
                            let prefix = ''
                            if (prefixColIndex !== -1 && row[prefixColIndex]) {
                                prefix = row[prefixColIndex].toString().trim()
                            }
                            names.push({
                                name,
                                prefix,
                                rowIndex: i,
                                rawRow: row
                            })
                        }
                    }
                }

                resolve(names)
            } catch (error) {
                reject(new Error('خطأ في قراءة ملف Excel: ' + error.message))
            }
        }
        reader.onerror = () => reject(new Error('خطأ في قراءة الملف'))
        reader.readAsArrayBuffer(file)
    })
}
