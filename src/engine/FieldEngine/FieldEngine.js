/**
 * 🏷️ FieldEngine.js
 * Manages the available fields that can be mapped on a template and their specific behaviors.
 *
 * bindingKey:
 *   When a field carries a bindingKey, its display value is resolved at runtime
 *   from system-settings[bindingKey] instead of the hardcoded textContent.
 *   This ensures ANY identity change in SystemSettings propagates to ALL templates instantly.
 *
 *   Resolution order (TemplateRenderer & TemplateMapper canvas):
 *     1. dataContext[field.fieldId]          ← runtime certificate data (highest priority)
 *     2. settings[field.bindingKey]          ← system-settings live value
 *     3. settings[meta.bindingKey]           ← field-type default binding
 *     4. field.textContent                   ← frozen snapshot (fallback)
 *     5. `[${meta.label}]`                   ← placeholder (lowest priority)
 */

// ── Binding Key Registry ───────────────────────────────────────────────────────
// Maps field IDs to the system-settings key they should read from.
export const FIELD_BINDING_KEYS = {
    // Certificate Texts
    certificate_title:         null,                      // user-defined per template
    reason:                    null,                      // user-defined per certificate
    wishes_text:               'certificate_closing_text',
    certificate_header_text:   'certificate_header_text',
    certificate_closing_text:  'certificate_closing_text',

    // General Manager
    general_manager_name:      'general_manager_name',
    general_manager_title:     'general_manager_title',
    general_manager_signature: 'general_manager_signature',
    manager_name:              'general_manager_name',
    manager_signature:         'general_manager_signature',

    // Assistant Planning Director
    assistant_planning_name:      'assistant_planning_name',
    assistant_planning_title:     'assistant_planning_title',
    assistant_planning_signature: 'assistant_planning_signature',
    assistant_name:               'assistant_planning_name',
    assistant_signature:          'assistant_planning_signature',

    // Official Seal / Stamp
    official_stamp:    'official_seal',
    official_seal:     'official_seal',
    official_signature:'official_signature',
};

export const SUPPORTED_FIELDS = [
    // ── Core Certificate Text Fields ──────────────────────────────────────
    { id: 'recipient_name',            label: 'اسم المستفيد',                       type: 'text',     defaultFontSize: 42, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold',   supportsPrefix: true },
    { id: 'certificate_title',         label: 'عنوان الشهادة (شكر وتقدير)',          type: 'text',     defaultFontSize: 34, defaultColor: '#0d1f3c', defaultFontFamily: 'Cairo',   defaultWeight: '900' },
    { id: 'reason',                    label: 'نص التكريم (Appreciation Text)',       type: 'textarea', defaultFontSize: 24, defaultColor: '#333333', defaultFontFamily: 'Amiri',   defaultWeight: 'normal' },
    { id: 'wishes_text',               label: 'النص الختامي (الدعاء)',               type: 'textarea', defaultFontSize: 20, defaultColor: '#555555', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: '',                      bindingKey: 'certificate_closing_text' },

    // ── Official Identity Text Fields (from system-settings) ─────────────
    { id: 'certificate_header_text',   label: 'نص رأس الشهادة الرسمي',              type: 'textarea', defaultFontSize: 22, defaultColor: '#333333', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: '', bindingKey: 'certificate_header_text' },
    { id: 'certificate_closing_text',  label: 'النص الختامي الرسمي',                type: 'textarea', defaultFontSize: 18, defaultColor: '#555555', defaultFontFamily: 'Amiri',   defaultWeight: 'normal', defaultContent: '', bindingKey: 'certificate_closing_text' },

    // ── General Manager Fields ────────────────────────────────────────────
    { id: 'general_manager_name',      label: 'اسم المدير العام',                   type: 'text',     defaultFontSize: 18, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold',   bindingKey: 'general_manager_name' },
    { id: 'general_manager_title',     label: 'مسمى المدير العام',                  type: 'text',     defaultFontSize: 14, defaultColor: '#444444', defaultFontFamily: 'Cairo',   defaultWeight: 'normal', bindingKey: 'general_manager_title' },
    { id: 'general_manager_signature', label: 'توقيع المدير العام',                 type: 'image',    defaultWidth: 160,   defaultHeight: 90,                                                               bindingKey: 'general_manager_signature' },

    // ── Assistant Planning Director Fields ────────────────────────────────
    { id: 'assistant_planning_name',      label: 'اسم مساعد المدير (التخطيط)',      type: 'text',     defaultFontSize: 16, defaultColor: '#000000', defaultFontFamily: 'Cairo',   defaultWeight: 'bold',   bindingKey: 'assistant_planning_name' },
    { id: 'assistant_planning_title',     label: 'مسمى مساعد المدير (التخطيط)',     type: 'text',     defaultFontSize: 13, defaultColor: '#444444', defaultFontFamily: 'Cairo',   defaultWeight: 'normal', bindingKey: 'assistant_planning_title' },
    { id: 'assistant_planning_signature', label: 'توقيع مساعد المدير (التخطيط)',    type: 'image',    defaultWidth: 130,   defaultHeight: 70,                                                               bindingKey: 'assistant_planning_signature' },

    // ── Legacy / General Fields ───────────────────────────────────────────
    { id: 'date',                label: 'التاريخ المطبوع',      type: 'text',  defaultFontSize: 16, defaultColor: '#666666', defaultFontFamily: 'Cairo',     defaultWeight: 'bold' },
    { id: 'serial_number',       label: 'الرقم التسلسلي',       type: 'text',  defaultFontSize: 14, defaultColor: '#888888', defaultFontFamily: 'monospace',  defaultWeight: 'normal' },
    { id: 'manager_name',        label: 'اسم المدير المطبوع',   type: 'text',  defaultFontSize: 18, defaultColor: '#000000', defaultFontFamily: 'Cairo',     defaultWeight: 'bold',   bindingKey: 'general_manager_name' },
    { id: 'assistant_name',      label: 'اسم المساعد المطبوع',  type: 'text',  defaultFontSize: 16, defaultColor: '#000000', defaultFontFamily: 'Cairo',     defaultWeight: 'bold',   bindingKey: 'assistant_planning_name' },
    { id: 'manager_signature',   label: 'توقيع المدير العام',   type: 'image', defaultWidth: 150,   defaultHeight: 80,                                                                   bindingKey: 'general_manager_signature' },
    { id: 'assistant_signature', label: 'توقيع المساعد',         type: 'image', defaultWidth: 120,   defaultHeight: 60,                                                                   bindingKey: 'assistant_planning_signature' },
    { id: 'official_stamp',      label: 'الختم الرسمي',          type: 'image', defaultWidth: 120,   defaultHeight: 120,                                                                  bindingKey: 'official_seal' },
    { id: 'official_seal',       label: 'الختم الرسمي (الإعدادات)',   type: 'image', defaultWidth: 120, defaultHeight: 120,                                                              bindingKey: 'official_seal' },
    { id: 'official_signature',  label: 'التوقيع الرسمي (عام)', type: 'image', defaultWidth: 140,   defaultHeight: 80,                                                                   bindingKey: 'official_signature' },
    { id: 'qr_code',             label: 'رمز التحقق (QR)',       type: 'qr',   defaultWidth: 80,    defaultHeight: 80 }
];

export const getFieldMeta = (fieldId) => {
    return SUPPORTED_FIELDS.find(f => f.id === fieldId) || null;
};

/**
 * resolveFieldValue — Single Source of Truth for field value resolution.
 *
 * @param {object} field      - The field object from the template
 * @param {object} meta       - Result of getFieldMeta(field.fieldId)
 * @param {object} dataContext - Runtime certificate data (recipient name, reason, etc.)
 * @param {object} settings   - System settings from AuthContext / settingService
 * @returns {string|null}     - Resolved display value
 */
export const resolveFieldValue = (field, meta, dataContext = {}, settings = {}) => {
    // 1. Runtime data has highest priority (recipient name, reason, date, serial, qr_code)
    const runtimeValue = dataContext?.[field.fieldId];
    if (runtimeValue !== undefined && runtimeValue !== null && runtimeValue !== '') {
        return runtimeValue;
    }

    // 2. bindingKey on the field instance (set by designer in TemplateMapper)
    if (field.bindingKey && settings?.[field.bindingKey] !== undefined && settings?.[field.bindingKey] !== null) {
        return settings[field.bindingKey];
    }

    // 3. bindingKey from field-type meta (defined in SUPPORTED_FIELDS)
    if (meta?.bindingKey && settings?.[meta.bindingKey] !== undefined && settings?.[meta.bindingKey] !== null) {
        return settings[meta.bindingKey];
    }

    // 4. FIELD_BINDING_KEYS registry (legacy resolution for old templates without bindingKey on field)
    const registryKey = FIELD_BINDING_KEYS[field.fieldId];
    if (registryKey && settings?.[registryKey] !== undefined && settings?.[registryKey] !== null) {
        return settings[registryKey];
    }

    // 5. Frozen textContent snapshot (backward compat)
    if (field.textContent !== undefined && field.textContent !== '') {
        return field.textContent;
    }

    // 6. Placeholder
    return null;
};

/**
 * Extracts data payload for specific fields (legacy helper)
 */
export const injectData = (fieldId, dataContext) => {
    if (!dataContext) return '';
    return dataContext[fieldId] || '';
};
