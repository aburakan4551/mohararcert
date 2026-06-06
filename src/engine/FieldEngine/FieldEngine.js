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
    // 0. Check certificateSnapshot first for template fields (backward compatibility with GM/Assistant changes)
    const snap = dataContext?.certificateSnapshot || {};
    if (snap && Object.keys(snap).length > 0) {
        if ((field.fieldId === 'general_manager_name' || field.fieldId === 'manager_name') && snap.approver_name) return snap.approver_name;
        if (field.fieldId === 'general_manager_title' && snap.approver_title) return snap.approver_title;
        if ((field.fieldId === 'general_manager_signature' || field.fieldId === 'manager_signature') && snap.signature_1) return snap.signature_1;
        if ((field.fieldId === 'assistant_planning_name' || field.fieldId === 'assistant_name') && snap.signer_name) return snap.signer_name;
        if (field.fieldId === 'assistant_planning_title' && snap.signer_title) return snap.signer_title;
        if ((field.fieldId === 'assistant_planning_signature' || field.fieldId === 'assistant_signature') && snap.signature_2) return snap.signature_2;
        if ((field.fieldId === 'official_stamp' || field.fieldId === 'official_seal') && snap.official_stamp) return snap.official_stamp;
        if (field.fieldId === 'official_signature' && snap.signature_3) return snap.signature_3;
    }

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

/**
 * Dynamic Sanitizer / Formatter for recipient name.
 * Prevents duplicate/double prefixes, preserves prefix/title on old records,
 * and formats using a single space separator.
 * 
 * @param {object} cert - The certificate object containing recipientName and prefix
 * @returns {string} - Clean display name
 */
export const getRecipientDisplayName = (cert) => {
    if (!cert) return '';
    let name = (cert.recipientName || '').trim();
    let prefix = (cert.prefix || '').trim();

    // Clean up slashes in name if any (e.g. "الدكتور/ أحمد" -> "الدكتور أحمد")
    name = name.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();

    if (prefix) {
        // Prevent double prefix
        if (name.startsWith(prefix + ' ') || name === prefix) {
            return name;
        }
        return `${prefix} ${name}`;
    }

    return name;
};

/**
 * Extracts and cleans prefix and raw name from typed/imported input names.
 * Ensures the prefix is isolated, the name is saved raw, and duplicate prefixing is prevented.
 * 
 * @param {string} inputName - The typed or imported beneficiary name (might contain prefix)
 * @param {string} selectedPrefix - The selected prefix from the UI
 * @param {string[]} officialTitles - Supported official prefixes from settings
 * @returns {{prefix: string, rawName: string}} - Extracted prefix and raw name
 */
export const extractPrefixAndName = (inputName, selectedPrefix = '', officialTitles = []) => {
    let name = (inputName || '').trim();
    // Normalize slashes and spacing
    name = name.replace(/\s*\/\s*/g, ' ').replace(/\s+/g, ' ').trim();

    let prefix = (selectedPrefix || '').trim();

    // Standard list of titles to check if officialTitles is empty
    const titlesToCheck = officialTitles.length > 0 
        ? officialTitles 
        : ['الدكتور', 'الدكتورة', 'الأستاذ', 'الأستاذة', 'المهندس', 'الشيخ', 'الدكتورة', 'أ.', 'د.'];

    // Sort titles by length descending to match longest first
    const sortedTitles = [...new Set(titlesToCheck)].filter(Boolean).sort((a, b) => b.length - a.length);

    // Check if the name starts with any known prefix
    let detectedPrefix = '';
    for (const title of sortedTitles) {
        if (name.startsWith(title + ' ')) {
            detectedPrefix = title;
            name = name.substring(title.length + 1).trim();
            break;
        } else if (name === title) {
            detectedPrefix = title;
            name = '';
            break;
        }
    }

    // Resolve prefix: if a prefix was detected in the name text, use it.
    // Otherwise, use the selectedPrefix from the UI.
    const finalPrefix = detectedPrefix || prefix;

    return {
        prefix: finalPrefix,
        rawName: name
    };
};

/**
 * resolveDynamicField — Resolves standard and dynamic fields from settings or snapshots.
 *
 * @param {string} dynamicType - The type/key of the dynamic variable
 * @param {object} dataContext - Certificate context containing snapshots
 * @param {object} settings    - Live system settings
 * @returns {string}           - Resolved string value or image base64
 */
export const resolveDynamicField = (dynamicType, dataContext = {}, settings = {}) => {
    // 1. Read from certificateSnapshot first
    const snap = dataContext?.certificateSnapshot || {};
    if (snap && snap[dynamicType] !== undefined && snap[dynamicType] !== null && snap[dynamicType] !== '') {
        return snap[dynamicType];
    }

    // 2. Read from legacy managerSnapshot/assistantSnapshot
    const assistant = dataContext?.assistantSnapshot || {};
    const manager = dataContext?.managerSnapshot || {};

    if (dynamicType === 'signer_name') {
        return assistant.visaName || settings.assistant_planning_name || settings.visaName || '';
    }
    if (dynamicType === 'signer_title') {
        return assistant.visaLabel || settings.assistant_planning_title || settings.visaLabel || 'مساعد المدير العام للتخطيط';
    }
    if (dynamicType === 'approver_name') {
        return manager.directorName || settings.general_manager_name || settings.directorName || '';
    }
    if (dynamicType === 'approver_title') {
        return manager.directorTitle || settings.general_manager_title || settings.directorTitle || 'مدير عام فرع وزارة الصحة بالحدود الشمالية';
    }
    if (dynamicType === 'signature_1') {
        return manager.directorSignature || settings.general_manager_signature || settings.directorSignature || '';
    }
    if (dynamicType === 'signature_2') {
        return assistant.visaSignature || settings.assistant_planning_signature || settings.visaSignature || '';
    }
    if (dynamicType === 'signature_3') {
        return settings.official_signature || '';
    }
    if (dynamicType === 'official_stamp') {
        return manager.stamp || settings.official_seal || settings.stamp || '';
    }

    return '';
};

/**
 * buildCertificateSnapshot — Captures a minimal snapshot of dynamic variables active at generation time.
 *
 * @param {object} settings - The live settings object from AuthContext
 * @returns {object}        - Captured certificateSnapshot object
 */
export const buildCertificateSnapshot = (settings = {}) => {
    return {
        signer_name: settings.assistant_planning_name || settings.visaName || '',
        signer_title: settings.assistant_planning_title || settings.visaLabel || '',
        approver_name: settings.general_manager_name || settings.directorName || '',
        approver_title: settings.general_manager_title || settings.directorTitle || '',
        signature_1: settings.general_manager_signature || settings.directorSignature || '',
        signature_2: settings.assistant_planning_signature || settings.visaSignature || '',
        signature_3: settings.official_signature || '',
        official_stamp: settings.official_seal || settings.stamp || ''
    };
};

/**
 * getLayerZIndex — Resolves visual stacking order z-index based on field type/ID.
 * 
 * Layer 1: Background (implicit or zIndex 0/10)
 * Layer 2: Decorative Elements (zIndex 20)
 * Layer 3: Official Stamps (zIndex 30)
 * Layer 4: Signatures (zIndex 40)
 * Layer 5: Static Certificate Text (zIndex 50)
 * Layer 6: Dynamic Text + QR (zIndex 60)
 * 
 * @param {object} field - Field item to evaluate
 * @returns {number}     - z-index value representing the target layer
 */
export const getLayerZIndex = (field) => {
    if (!field) return 10;
    const id = (field.id || '').toLowerCase();
    const fieldId = (field.fieldId || '').toLowerCase();
    const name = (field.name || '').toLowerCase();
    const dynamicType = (field.dynamicType || '').toLowerCase();
    const type = (field.type || '').toLowerCase();

    // Layer 3: Official Stamps
    const isStamp = 
        id === 'official_stamp' || 
        id === 'official_seal' || 
        id === 'stamp' ||
        fieldId === 'official_stamp' || 
        fieldId === 'official_seal' || 
        fieldId === 'stamp' ||
        name === 'official_stamp' || 
        name === 'official_seal' || 
        name === 'stamp' ||
        dynamicType === 'official_stamp' ||
        type === 'stamp';
    if (isStamp) return 30;

    // Layer 4: Signatures
    const isSignature = 
        id.includes('signature') || 
        id.includes('sig') ||
        fieldId.includes('signature') || 
        fieldId.includes('sig') ||
        name.startsWith('signature') || 
        name.includes('sig') ||
        dynamicType.startsWith('signature') ||
        type === 'signature';
    if (isSignature) return 40;

    // Layer 6: Dynamic Text (Names / Titles / Certificate Number / QR)
    const isQR = type === 'qr' || id === 'qr_code' || id === 'qr' || fieldId === 'qr_code' || name === 'qr_code';
    const isDynamicText = 
        id === 'recipient_name' || 
        id === 'recipientname' ||
        id === 'name' || 
        id === 'reason' || 
        id === 'date' || 
        id === 'serial' || 
        id === 'serial_number' ||
        id === 'director-name' || 
        id === 'visa-name' || 
        fieldId === 'recipient_name' || 
        fieldId === 'reason' || 
        fieldId === 'date' || 
        fieldId === 'serial_number' ||
        name === 'recipient_name' || 
        name === 'recipientname' ||
        name === 'reason' || 
        name === 'reasontext' ||
        name === 'date' || 
        name === 'serial' || 
        name === 'serial_number' ||
        dynamicType === 'signer_name' || 
        dynamicType === 'signer_title' || 
        dynamicType === 'approver_name' || 
        dynamicType === 'approver_title' ||
        name === 'signer_name' || 
        name === 'signer_title' || 
        name === 'approver_name' || 
        name === 'approver_title';

    if (isQR || isDynamicText) return 60;

    // Layer 5: Static Certificate Text
    const isText = type === 'text' || type === 'textarea' || !type;
    if (isText) return 50;

    // Layer 2: Decorative Elements (shapes, logos, borders, custom images that are not stamps/signatures)
    return 20;
};



