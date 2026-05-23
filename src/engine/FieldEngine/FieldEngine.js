/**
 * 🏷️ FieldEngine.js
 * Manages the available fields that can be mapped on a template and their specific behaviors.
 */

export const SUPPORTED_FIELDS = [
    { id: 'recipient_name', label: 'اسم المستفيد', type: 'text', defaultFontSize: 42, defaultColor: '#000000', defaultFontFamily: 'Cairo', defaultWeight: 'bold', supportsPrefix: true },
    { id: 'certificate_title', label: 'عنوان الشهادة (شكر وتقدير)', type: 'text', defaultFontSize: 34, defaultColor: '#0d1f3c', defaultFontFamily: 'Cairo', defaultWeight: '900' },
    { id: 'reason', label: 'نص التكريم (Appreciation Text)', type: 'textarea', defaultFontSize: 24, defaultColor: '#333333', defaultFontFamily: 'Amiri', defaultWeight: 'normal' },
    { id: 'date', label: 'التاريخ المطبوع', type: 'text', defaultFontSize: 16, defaultColor: '#666666', defaultFontFamily: 'Cairo', defaultWeight: 'bold' },
    { id: 'serial_number', label: 'الرقم التسلسلي', type: 'text', defaultFontSize: 14, defaultColor: '#888888', defaultFontFamily: 'monospace', defaultWeight: 'normal' },
    { id: 'manager_name', label: 'اسم المدير المطبوع', type: 'text', defaultFontSize: 18, defaultColor: '#000000', defaultFontFamily: 'Cairo', defaultWeight: 'bold' },
    { id: 'assistant_name', label: 'اسم المساعد المطبوع', type: 'text', defaultFontSize: 16, defaultColor: '#000000', defaultFontFamily: 'Cairo', defaultWeight: 'bold' },
    { id: 'manager_signature', label: 'توقيع المدير العام', type: 'image', defaultWidth: 150, defaultHeight: 80 },
    { id: 'assistant_signature', label: 'توقيع المساعد', type: 'image', defaultWidth: 120, defaultHeight: 60 },
    { id: 'official_stamp', label: 'الختم الرسمي', type: 'image', defaultWidth: 120, defaultHeight: 120 },
    { id: 'qr_code', label: 'رمز التحقق (QR)', type: 'qr', defaultWidth: 80, defaultHeight: 80 }
];

export const getFieldMeta = (fieldId) => {
    return SUPPORTED_FIELDS.find(f => f.id === fieldId) || null;
};

/**
 * Extracts data payload for specific fields
 */
export const injectData = (fieldId, dataContext) => {
    if (!dataContext) return '';
    return dataContext[fieldId] || '';
};
