/**
 * 🏷️ FieldEngine.js
 * Manages the available fields that can be mapped on a template and their specific behaviors.
 */

export const SUPPORTED_FIELDS = [
    // ── Core Certificate Text Fields ──────────────────────────────────────
    { id: 'recipient_name',            label: 'اسم المستفيد',                       type: 'text',     defaultFontSize: 42, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold',   supportsPrefix: true },
    { id: 'certificate_title',         label: 'عنوان الشهادة (شكر وتقدير)',          type: 'text',     defaultFontSize: 34, defaultColor: '#0d1f3c', defaultFontFamily: 'Cairo',   defaultWeight: '900' },
    { id: 'reason',                    label: 'نص التكريم (Appreciation Text)',       type: 'textarea', defaultFontSize: 24, defaultColor: '#333333', defaultFontFamily: 'Amiri',   defaultWeight: 'normal' },
    { id: 'wishes_text',               label: 'النص الختامي (الدعاء)',               type: 'textarea', defaultFontSize: 20, defaultColor: '#555555', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: 'سائلين الله له/ـها دوام التوفيق والنجاح' },

    // ── Official Identity Text Fields (from system-settings) ─────────────
    { id: 'certificate_header_text',   label: 'نص رأس الشهادة الرسمي',              type: 'textarea', defaultFontSize: 22, defaultColor: '#333333', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: '{{certificate_header_text}}' },
    { id: 'certificate_closing_text',  label: 'النص الختامي الرسمي',                type: 'textarea', defaultFontSize: 18, defaultColor: '#555555', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: '{{certificate_closing_text}}' },

    // ── General Manager Fields ────────────────────────────────────────────
    { id: 'general_manager_name',      label: 'اسم المدير العام',                   type: 'text',     defaultFontSize: 18, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold' },
    { id: 'general_manager_title',     label: 'مسمى المدير العام',                  type: 'text',     defaultFontSize: 14, defaultColor: '#444444', defaultFontFamily: 'Cairo',   defaultWeight: 'normal' },
    { id: 'general_manager_signature', label: 'توقيع المدير العام',                 type: 'image',    defaultWidth: 160,   defaultHeight: 90 },

    // ── Assistant Planning Director Fields ────────────────────────────────
    { id: 'assistant_planning_name',      label: 'اسم مساعد المدير (التخطيط)',      type: 'text',     defaultFontSize: 16, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold' },
    { id: 'assistant_planning_title',     label: 'مسمى مساعد المدير (التخطيط)',     type: 'text',     defaultFontSize: 13, defaultColor: '#444444', defaultFontFamily: 'Cairo',   defaultWeight: 'normal' },
    { id: 'assistant_planning_signature', label: 'توقيع مساعد المدير (التخطيط)',    type: 'image',    defaultWidth: 130,   defaultHeight: 70 },

    // ── Legacy / General Fields ───────────────────────────────────────────
    { id: 'date',              label: 'التاريخ المطبوع',    type: 'text',  defaultFontSize: 16, defaultColor: '#666666', defaultFontFamily: 'Cairo',     defaultWeight: 'bold' },
    { id: 'serial_number',    label: 'الرقم التسلسلي',     type: 'text',  defaultFontSize: 14, defaultColor: '#888888', defaultFontFamily: 'monospace',  defaultWeight: 'normal' },
    { id: 'manager_name',     label: 'اسم المدير المطبوع', type: 'text',  defaultFontSize: 18, defaultColor: '#000000', defaultFontFamily: 'Cairo',     defaultWeight: 'bold' },
    { id: 'assistant_name',   label: 'اسم المساعد المطبوع',type: 'text',  defaultFontSize: 16, defaultColor: '#000000', defaultFontFamily: 'Cairo',     defaultWeight: 'bold' },
    { id: 'manager_signature',   label: 'توقيع المدير العام',  type: 'image', defaultWidth: 150, defaultHeight: 80 },
    { id: 'assistant_signature', label: 'توقيع المساعد',        type: 'image', defaultWidth: 120, defaultHeight: 60 },
    { id: 'official_stamp',      label: 'الختم الرسمي',         type: 'image', defaultWidth: 120, defaultHeight: 120 },
    { id: 'official_seal',       label: 'الختم الرسمي (من الإعدادات)', type: 'image', defaultWidth: 120, defaultHeight: 120 },
    { id: 'official_signature',  label: 'التوقيع الرسمي (عام)',        type: 'image', defaultWidth: 140, defaultHeight: 80 },
    { id: 'qr_code',             label: 'رمز التحقق (QR)',             type: 'qr',   defaultWidth: 80,  defaultHeight: 80 }
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
