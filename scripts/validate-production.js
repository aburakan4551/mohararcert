/**
 * 🧪 validate-production.js
 * Automated programmatic verification suite for mohararcert Forms & Security.
 * Simulates user sessions, database transactions, RBAC controls, and version snapshots.
 */

// 1. Mock Browser Environment Globals
const storage = {};
global.localStorage = {
    getItem: (key) => storage[key] || null,
    setItem: (key, val) => { storage[key] = String(val); },
    removeItem: (key) => { delete storage[key]; },
    clear: () => { for (const k in storage) delete storage[k]; }
};
const session = {};
global.sessionStorage = {
    getItem: (key) => session[key] || null,
    setItem: (key, val) => { session[key] = String(val); },
    removeItem: (key) => { delete session[key]; },
    clear: () => { for (const k in session) delete session[k]; }
};
global.window = {
    migratedCertificatesCount: 0
};

// Run tests
async function runTests() {
    console.log("======================================================");
    console.log("🧪 بدء فحص التحقق البرمجي التلقائي لنظام النماذج والصلاحيات");
    console.log("======================================================");

    // Import Services dynamically after mocks are set up
    const { localProvider } = await import('../src/services/providers/local.provider.js');

    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(` ✅ [نجح]: ${message}`);
            passed++;
        } else {
            console.log(` ❌ [فشل]: ${message}`);
            failed++;
        }
    }

    try {
        // --- 1. فحص صلاحيات المستخدم العادي (CREATOR) ---
        console.log("\n[1] فحص حوكمة الصلاحيات والأدوار (RBAC Gate Control)...");
        const creatorUser = { id: 'usr-1', email: 'creator@moh.gov.sa', role: 'CREATOR', name: 'سلمان الرويلي' };
        sessionStorage.setItem('current_user_session', JSON.stringify(creatorUser));
        
        let creatorAccessBlocked = false;
        try {
            localProvider.forms.checkAdmin();
        } catch (e) {
            creatorAccessBlocked = true;
        }
        assert(creatorAccessBlocked, "المستخدم العادي (CREATOR) يُمنع تماماً من الوصول لخدمات النماذج البرمجية.");

        // --- 2. فحص صلاحيات المدير (SUPER_ADMIN) ---
        const adminUser = { id: 'usr-4', email: 'admin@moh.gov.sa', role: 'SUPER_ADMIN', name: 'يوسف العنزي' };
        sessionStorage.setItem('current_user_session', JSON.stringify(adminUser));
        
        let adminAccessGranted = false;
        try {
            localProvider.forms.checkAdmin();
            adminAccessGranted = true;
        } catch (e) {}
        assert(adminAccessGranted, "المدير العام (SUPER_ADMIN) يُمنح وصولاً كاملاً لإدارة النماذج.");

        // --- 3. دورة العمل: إنشاء نموذج جديد ---
        console.log("\n[2] دورة العمل: إنشاء نموذج جديد وربطه بقالب وتعيين إحداثيات A4...");
        const newFormPayload = {
            id: 'form-test-101',
            name: 'نموذج الفحص التلقائي v1',
            templateId: 'tpl-1',
            templateName: 'شهادة شكر وتقدير الفرع',
            orientation: 'landscape',
            version: 1,
            fields: [
                {
                    id: 'fld-t1',
                    name: 'recipientName',
                    label: 'الاسم المكرم',
                    type: 'text',
                    x: 200,
                    y: 350,
                    width: 722,
                    height: 50,
                    required: true,
                    certificateMapping: 'recipientName'
                }
            ]
        };

        const createdForm = await localProvider.forms.create(newFormPayload);
        assert(createdForm && createdForm.status === 'DRAFT', "تم إنشاء النموذج بنجاح وبحالة افتراضية مسودة (DRAFT).");
        assert(createdForm.fields[0].x === 200 && createdForm.fields[0].baseWidth === undefined, "يتم تخزين الإحداثيات بالنسبة لحجم Canvas الأساسي للمصمم بنجاح.");

        // --- 4. نشر النموذج وتجميد لقطة القالب (Template Snapshot Freeze) ---
        console.log("\n[3] فحص نشر النموذج وتجميد القالب المرجعي...");
        const activeTemplate = { id: 'tpl-1', name: 'قالب رسمي متميز', version: 3, backgroundUrl: '/test.jpg' };
        
        const publishedForm = await localProvider.forms.update(createdForm.id, {
            status: 'PUBLISHED',
            frozenTemplate: activeTemplate
        });

        assert(publishedForm.status === 'PUBLISHED', "تم تحويل حالة النموذج بنجاح إلى منشور (PUBLISHED).");
        assert(publishedForm.frozenTemplate && publishedForm.frozenTemplate.version === 3, "تم حفظ لقطة مجمدة من القالب المربوط بالنموذج (Version Snapshot) بنجاح.");

        // --- 5. تعبئة النموذج وإصدار وثيقة (Submission Audit Trail) ---
        console.log("\n[4] فحص تعبئة النموذج وإصدار وثيقة مرافقة لبيانات التدقيق والتسجيل...");
        const submissionValues = {
            recipientName: 'عبدالرحمن الشمالي'
        };

        const generatedCertificatePayload = {
            id: 'cert-test-101',
            recipientName: submissionValues.recipientName,
            event: 'المناسبة الرسمية للفحص',
            date: '2026/06/06',
            serial: '2026-TEST-99',
            templateId: publishedForm.templateId,
            formId: publishedForm.id,
            formFields: publishedForm.fields,
            formValues: submissionValues,
            frozenTemplate: publishedForm.frozenTemplate,
            status: 'DRAFT',
            createdBy: creatorUser.id,
            creatorName: creatorUser.name,
            submissionDetails: {
                formId: publishedForm.id,
                formVersion: publishedForm.version,
                submittedBy: creatorUser.id,
                submittedAt: new Date().toISOString()
            }
        };

        const createdCert = await localProvider.certificates.create(generatedCertificatePayload);
        await localProvider.forms.incrementUsage(publishedForm.id);

        assert(createdCert && createdCert.formId === 'form-test-101', "تم توليد الشهادة الرسمية وربطها بالنموذج بنجاح.");
        assert(createdCert.submissionDetails.submittedBy === 'usr-1', "تم حفظ سجل التدقيق بالكامل (Submission Audit Trail) بنجاح.");
        assert(createdCert.frozenTemplate.version === 3, "الشهادة تحمل لقطة القالب المجمد لضمان توافق العرض المستقبلي.");

        // --- 6. فحص قفل التعديل للنماذج المستعملة (Immutability Lock) ---
        console.log("\n[5] فحص منع التعديل للنماذج المنشورة المستعملة (Immutability Guard)...");
        let editBlocked = false;
        try {
            await localProvider.forms.update(publishedForm.id, {
                fields: []
            });
        } catch (e) {
            editBlocked = true;
        }
        assert(editBlocked, "يتم منع تعديل حقول نموذج يحتوي على استخدامات أو معاملات مصدرة.");

        // --- 7. فحص الحذف المؤقت والاستعادة (Soft Delete & Recovery) ---
        console.log("\n[6] فحص الحذف المؤقت وسلة المهملات والاستعادة...");
        
        // Let's create an unused draft form to test delete
        const unusedForm = await localProvider.forms.create({
            id: 'form-test-unused',
            name: 'نموذج غير مستعمل للمسح',
            templateId: 'tpl-1',
            fields: []
        });

        await localProvider.forms.delete(unusedForm.id);
        const deletedForm = await localProvider.forms.getById(unusedForm.id);
        assert(deletedForm.status === 'DELETED', "يتم مسح النموذج مؤقتاً (Soft Delete) بتحويل حالته إلى DELETED.");

        const recoveredForm = await localProvider.forms.recover(unusedForm.id);
        assert(recoveredForm.status === 'DRAFT', "تم استعادة النموذج المحذوف بنجاح وإرجاعه لحالة مسودة (DRAFT).");

        // --- 8. الفحص النهائي: محاكاة سحب حقل ديناميكي، حفظه، التحقق منه، وتأمين لقطة الشهادة ---
        console.log("\n[7] الفحص النهائي: محاكاة سحب حقل ديناميكي، حفظه، التحقق منه، وتأمين لقطة الشهادة...");

        // 1. Get current settings and set baseline
        const baseSettings = await localProvider.settings.get();
        await localProvider.settings.update({
            general_manager_name: 'أ. منصور بن سالم الرشيدي',
            general_manager_title: 'مدير عام فرع وزارة الصحة بمنطقة الحدود الشمالية',
            general_manager_signature: 'sig_data_1',
            assistant_planning_name: 'أ. أحمد بن محمد السويلم',
            assistant_planning_title: 'مساعد المدير العام للتخطيط والتحول',
            assistant_planning_signature: 'sig_data_assistant_1',
            official_seal: 'stamp_data_1'
        });

        // 2. Create a form with a dynamic field (e.g. signer_name, official_stamp)
        const dynamicFormPayload = {
            id: 'form-dynamic-test-77',
            name: 'نموذج الحقول الديناميكية المطور',
            templateId: 'tpl-1',
            templateName: 'شهادة شكر وتقدير الفرع',
            orientation: 'landscape',
            version: 1,
            fields: [
                {
                    id: 'fld-dyn-1',
                    name: 'signer_name',
                    label: 'اسم مساعد المدير',
                    type: 'title',
                    dynamicType: 'signer_name',
                    x: 150,
                    y: 200,
                    width: 180,
                    height: 35,
                    required: false,
                    certificateMapping: ''
                },
                {
                    id: 'fld-dyn-2',
                    name: 'official_stamp',
                    label: 'الختم الرسمي',
                    type: 'stamp',
                    dynamicType: 'official_stamp',
                    x: 300,
                    y: 400,
                    width: 110,
                    height: 110,
                    required: false,
                    certificateMapping: ''
                }
            ]
        };

        // 3. Save the form
        const savedDynForm = await localProvider.forms.create(dynamicFormPayload);
        assert(savedDynForm && savedDynForm.id === 'form-dynamic-test-77', "تم إنشاء وحفظ نموذج يحتوي على حقول ديناميكية بنجاح.");

        // 4. Retrieve/Reload the form and verify the fields exist
        const reloadedDynForm = await localProvider.forms.getById('form-dynamic-test-77');
        assert(reloadedDynForm && reloadedDynForm.fields.length === 2, "تمت إعادة فتح النموذج بنجاح والتأكد من بقاء الحقول الديناميكية المضافة.");
        assert(reloadedDynForm.fields[0].dynamicType === 'signer_name', "تم التحقق من ربط الحقل الأول تلقائياً بـ signer_name.");
        assert(reloadedDynForm.fields[1].dynamicType === 'official_stamp', "تم التحقق من ربط الحقل الثاني تلقائياً بـ official_stamp.");

        // 5. Create a certificate from this form (with snapshot)
        const { buildCertificateSnapshot, resolveDynamicField } = await import('../src/engine/FieldEngine/FieldEngine.js');
        const currentSettings = await localProvider.settings.get();

        const dynCertPayload = {
            id: 'cert-dyn-test-77',
            recipientName: 'فيصل الشمري',
            event: 'ورشة عمل الصحة الإلكترونية',
            date: '2026/06/06',
            serial: '2026-DYN-77',
            templateId: reloadedDynForm.templateId,
            formId: reloadedDynForm.id,
            formFields: reloadedDynForm.fields,
            formValues: {}, // dynamic fields don't need typed formValues
            frozenTemplate: { id: 'tpl-1', version: 1 },
            status: 'DRAFT',
            createdBy: creatorUser.id,
            creatorName: creatorUser.name,
            // Freeze Snapshot
            certificateSnapshot: buildCertificateSnapshot(currentSettings)
        };

        const certDyn = await localProvider.certificates.create(dynCertPayload);
        assert(certDyn && certDyn.id === 'cert-dyn-test-77', "تم إنشاء الشهادة بنجاح وحفظ الـ certificateSnapshot.");

        // 6. Verify that the correct resolved value appears in the rendering engine (resolveDynamicField)
        const resolvedName1 = resolveDynamicField('signer_name', certDyn, currentSettings);
        const resolvedStamp1 = resolveDynamicField('official_stamp', certDyn, currentSettings);
        assert(resolvedName1 === 'أ. أحمد بن محمد السويلم', "تفسير اسم مساعد المدير العام بنجاح من إعدادات النظام.");
        assert(resolvedStamp1 === 'stamp_data_1', "تفسير صورة الختم الرسمي بنجاح من إعدادات النظام.");

        // 7. Modify settings
        await localProvider.settings.update({
            assistant_planning_name: 'أ. خالد بن عبد العزيز الرويلي',
            official_seal: 'new_stamp_data_99'
        });

        // 8. Retrieve first certificate and verify it has not changed (uses old snapshot)
        const retrievedCertDyn1 = await localProvider.certificates.getById('cert-dyn-test-77');
        const updatedSettings = await localProvider.settings.get();

        const resolvedName1AfterChange = resolveDynamicField('signer_name', retrievedCertDyn1, updatedSettings);
        const resolvedStamp1AfterChange = resolveDynamicField('official_stamp', retrievedCertDyn1, updatedSettings);

        assert(resolvedName1AfterChange === 'أ. أحمد بن محمد السويلم', "الشهادة التاريخية القديمة لم تتغير وتستخدم الاسم القديم من اللقطة.");
        assert(resolvedStamp1AfterChange === 'stamp_data_1', "الشهادة التاريخية القديمة لم تتغير وتستخدم صورة الختم القديمة من اللقطة.");

        // 9. Create new certificate and verify it uses the new values
        const secondDynCertPayload = {
            id: 'cert-dyn-test-78',
            recipientName: 'نايف العنزي',
            event: 'ورشة عمل الصحة الإلكترونية 2',
            date: '2026/06/07',
            serial: '2026-DYN-78',
            templateId: reloadedDynForm.templateId,
            formId: reloadedDynForm.id,
            formFields: reloadedDynForm.fields,
            formValues: {},
            frozenTemplate: { id: 'tpl-1', version: 1 },
            status: 'DRAFT',
            createdBy: creatorUser.id,
            creatorName: creatorUser.name,
            certificateSnapshot: buildCertificateSnapshot(updatedSettings)
        };

        const certDyn2 = await localProvider.certificates.create(secondDynCertPayload);
        const resolvedName2 = resolveDynamicField('signer_name', certDyn2, updatedSettings);
        const resolvedStamp2 = resolveDynamicField('official_stamp', certDyn2, updatedSettings);

        assert(resolvedName2 === 'أ. خالد بن عبد العزيز الرويلي', "الشهادة الجديدة بعد تعديل الإعدادات تستخدم الاسم الجديد للموقّع.");
        assert(resolvedStamp2 === 'new_stamp_data_99', "الشهادة الجديدة بعد تعديل الإعدادات تستخدم الختم الجديد للمؤسسة.");

    } catch (e) {
        console.error("❌ حدث خطأ غير متوقع أثناء الفحص التلقائي:", e);
        failed++;
    }

    console.log("\n======================================================");
    console.log(`📊 الخلاصة: إجمالي الفحوصات الناجحة: ${passed} | إجمالي الفحوصات الفاشلة: ${failed}`);
    console.log("======================================================");
    
    if (failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();
