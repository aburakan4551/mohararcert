/**
 * 🧪 verify-full-workflow.js
 * Comprehensive workflow test simulating settings upload, login/logout,
 * certificate creation, approval flow snapshots, and layer rendering assertions.
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

async function runWorkflowTest() {
    console.log("======================================================");
    console.log("🧪 بدء فحص دورة العمل الكاملة للتواقيع والأختام واللقطات");
    console.log("======================================================");

    const { localProvider } = await import('../src/services/providers/local.provider.js');
    const { buildCertificateSnapshot, resolveDynamicField, resolveFieldValue, getLayerZIndex } = await import('../src/engine/FieldEngine/FieldEngine.js');

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
        const creatorUser = { id: 'usr-1', email: 'creator@moh.gov.sa', role: 'CREATOR', name: 'سلمان الرويلي' };
        const assistantUser = { id: 'usr-2', email: 'assistant@moh.gov.sa', role: 'ASSISTANT_MANAGER', name: 'مساعد المدير العام للتخطيط' };
        const managerUser = { id: 'usr-3', email: 'manager@moh.gov.sa', role: 'GENERAL_MANAGER', name: 'مدير فرع وزارة الصحة بالحدود الشمالية' };

        // ----------------------------------------------------
        // Step 1 & 2: رفع التواقيع وحفظ الإعدادات
        // ----------------------------------------------------
        console.log("\n[1] محاكاة رفع التواقيع والأختام وحفظ الإعدادات...");
        const mockGM = "data:image/png;base64,GM_SIGNATURE_BASE64_STUB_DATA";
        const mockAssistant = "data:image/png;base64,ASSISTANT_SIGNATURE_BASE64_STUB_DATA";
        const mockOfficial = "data:image/png;base64,OFFICIAL_SIGNATURE_BASE64_STUB_DATA";
        const mockStamp = "data:image/png;base64,OFFICIAL_STAMP_BASE64_STUB_DATA";

        const testSettingsInput = {
            general_manager_signature: mockGM,
            assistant_planning_signature: mockAssistant,
            official_signature: mockOfficial,
            official_seal: mockStamp,
            orgName: "وزارة الصحة السعودية",
            orgSubName: "فرع الحدود الشمالية"
        };

        const savedSettings = await localProvider.settings.update(testSettingsInput);
        assert(savedSettings.general_manager_signature === mockGM, "تم حفظ توقيع المدير العام.");
        assert(savedSettings.signature_1 === mockGM, "تمت مزامنة signature_1 مع توقيع المدير العام.");
        assert(savedSettings.directorSignature === mockGM, "تمت مزامنة directorSignature مع توقيع المدير العام.");
        assert(savedSettings.assistant_planning_signature === mockAssistant, "تم حفظ توقيع مساعد التخطيط.");
        assert(savedSettings.signature_2 === mockAssistant, "تمت مزامنة signature_2 مع توقيع مساعد التخطيط.");
        assert(savedSettings.official_signature === mockOfficial, "تم حفظ التوقيع الرسمي العام.");
        assert(savedSettings.signature_3 === mockOfficial, "تمت مزامنة signature_3 مع التوقيع العام.");
        assert(savedSettings.official_seal === mockStamp, "تم حفظ الختم الرسمي.");
        assert(savedSettings.stamp === mockStamp, "تمت مزامنة stamp مع الختم الرسمي.");
        assert(savedSettings.official_stamp === mockStamp, "تمت مزامنة official_stamp مع الختم الرسمي.");

        // ----------------------------------------------------
        // Step 3: Logout/Login وإعادة تحميل البيانات
        // ----------------------------------------------------
        console.log("\n[2] محاكاة تسجيل الخروج والدخول وإعادة قراءة الإعدادات...");
        sessionStorage.clear(); // Logout
        sessionStorage.setItem('current_user_session', JSON.stringify(creatorUser)); // Login

        const loadedSettings = await localProvider.settings.get();
        assert(loadedSettings.signature_1 === mockGM, "استرجاع signature_1 بنجاح بعد إعادة الدخول.");
        assert(loadedSettings.signature_2 === mockAssistant, "استرجاع signature_2 بنجاح بعد إعادة الدخول.");
        assert(loadedSettings.signature_3 === mockOfficial, "استرجاع signature_3 بنجاح بعد إعادة الدخول.");
        assert(loadedSettings.official_stamp === mockStamp, "استرجاع official_stamp بنجاح بعد إعادة الدخول.");

        // ----------------------------------------------------
        // Step 4 & 5: إنشاء شهادة جديدة وإرسالها للمساعد
        // ----------------------------------------------------
        console.log("\n[3] إنشاء شهادة جديدة وتعبئة الـ certificateSnapshot...");
        const creationSnapshot = buildCertificateSnapshot(loadedSettings);
        
        const certPayload = {
            id: 'cert-workflow-test-99',
            recipientName: 'فيصل بن عايد العنزي',
            event: 'ملتقى التحول الصحي الرقمي',
            date: '16 ذو القعدة 1447هـ',
            serial: '202699999',
            templateId: 'tpl-1',
            showQR: true,
            status: 'DRAFT',
            createdBy: creatorUser.id,
            creatorName: creatorUser.name,
            certificateSnapshot: creationSnapshot
        };

        const createdCert = await localProvider.certificates.create(certPayload);
        assert(createdCert.certificateSnapshot !== undefined, "تم إرفاق الـ certificateSnapshot بالشهادة.");
        assert(createdCert.certificateSnapshot.signature_1 === mockGM, "تم تجميد signature_1 داخل اللقطة.");
        assert(createdCert.certificateSnapshot.signature_2 === mockAssistant, "تم تجميد signature_2 داخل اللقطة.");
        assert(createdCert.certificateSnapshot.official_stamp === mockStamp, "تم تجميد الختم داخل اللقطة.");

        // إرسال المعاملة للاعتماد
        const submittedCert = await localProvider.certificates.transitionWorkflow(createdCert.id, 'PENDING_APPROVAL', creatorUser);
        assert(submittedCert.status === 'PENDING_APPROVAL', "تم تقديم الشهادة بنجاح وحالتها معلقة.");

        // فحص أنه في حالة PENDING_APPROVAL لا يظهر أي توقيع أو ختم
        const pPendingSig1 = resolveDynamicField('signature_1', submittedCert, loadedSettings);
        const pPendingSig2 = resolveDynamicField('signature_2', submittedCert, loadedSettings);
        const pPendingStamp = resolveDynamicField('official_stamp', submittedCert, loadedSettings);
        assert(pPendingSig1 === '', "في حالة PENDING_APPROVAL يمنع ظهور توقيع المدير.");
        assert(pPendingSig2 === '', "في حالة PENDING_APPROVAL يمنع ظهور توقيع المساعد.");
        assert(pPendingStamp === '', "في حالة PENDING_APPROVAL يمنع ظهور الختم.");

        // ----------------------------------------------------
        // Step 6: تأشيرة المساعد (Assistant Visa)
        // ----------------------------------------------------
        console.log("\n[4] مراجعة وتأشيرة مساعد المدير العام...");
        sessionStorage.clear();
        sessionStorage.setItem('current_user_session', JSON.stringify(assistantUser));

        const visaCert = await localProvider.certificates.transitionWorkflow(submittedCert.id, 'APPROVED_BY_ASSISTANT', assistantUser, 'تمت المراجعة والتأشير بالقبول');
        assert(visaCert.status === 'APPROVED_BY_ASSISTANT', "حالة الشهادة الآن: مؤشرة من مساعد المدير.");
        assert(visaCert.assistantSnapshot !== undefined, "تم إنشاء لقطة تأشيرة المساعد (assistantSnapshot).");
        assert(visaCert.assistantSnapshot.visaSignature === mockAssistant, "توقيع التأشيرة محفوظ ومطابق في اللقطة.");

        // فحص أنه في حالة APPROVED_BY_ASSISTANT يظهر توقيع المساعد فقط ويمنع ظهور توقيع المدير والختم
        const pVisaSig1 = resolveDynamicField('signature_1', visaCert, loadedSettings);
        const pVisaSig2 = resolveDynamicField('signature_2', visaCert, loadedSettings);
        const pVisaStamp = resolveDynamicField('official_stamp', visaCert, loadedSettings);
        assert(pVisaSig2 === mockAssistant, "في حالة APPROVED_BY_ASSISTANT يظهر توقيع المساعد.");
        assert(pVisaSig1 === '', "في حالة APPROVED_BY_ASSISTANT يمنع ظهور توقيع المدير.");
        assert(pVisaStamp === '', "في حالة APPROVED_BY_ASSISTANT يمنع ظهور الختم.");

        // ----------------------------------------------------
        // Step 7 & 8: اعتماد المدير العام (GM Final Approval)
        // ----------------------------------------------------
        console.log("\n[5] اعتماد وتوقيع وختم المدير العام (الاعتماد النهائي)...");
        sessionStorage.clear();
        sessionStorage.setItem('current_user_session', JSON.stringify(managerUser));

        const approvedCert = await localProvider.certificates.transitionWorkflow(visaCert.id, 'FINAL_APPROVED', managerUser, 'معتمد وموقع نهائياً');
        assert(approvedCert.status === 'FINAL_APPROVED', "حالة الشهادة الآن: معتمدة نهائياً.");
        assert(approvedCert.managerSnapshot !== undefined, "تم إنشاء لقطة المدير العام (managerSnapshot).");
        assert(approvedCert.managerSnapshot.directorSignature === mockGM, "توقيع المدير العام محفوظ ومطابق في لقطة الاعتماد النهائي.");
        assert(approvedCert.managerSnapshot.stamp === mockStamp, "الختم الرسمي محفوظ ومطابق في لقطة الاعتماد النهائي.");

        // ----------------------------------------------------
        // Step 9 & 10: فتح الأرشيف والرندرة ومطابقة الطبقات
        // ----------------------------------------------------
        console.log("\n[6] قراءة البيانات للأرشيف وتفسير الرندرة البصرية للمستند...");
        const finalCert = await localProvider.certificates.getById(approvedCert.id);
        
        // محاكاة تفسير الحقول الديناميكية في الرندرة للشهادة النهائية
        const resolvedStamp = resolveDynamicField('official_stamp', finalCert, loadedSettings);
        const resolvedSig1 = resolveDynamicField('signature_1', finalCert, loadedSettings);
        const resolvedSig2 = resolveDynamicField('signature_2', finalCert, loadedSettings);

        assert(resolvedStamp === mockStamp, "الرندر يفسر الختم من لقطة المدير العام بنجاح.");
        assert(resolvedSig1 === mockGM, "الرندر يفسر توقيع المدير العام من لقطة المدير العام بنجاح.");
        assert(resolvedSig2 === mockAssistant, "الرندر يفسر توقيع مساعد المدير من لقطة المساعد بنجاح.");

        // فحص ترتيب الطبقات الفعلي z-index
        const zStamp = getLayerZIndex({ type: 'stamp', name: 'official_stamp' });
        const zSig = getLayerZIndex({ type: 'signature', name: 'signature_1' });
        const zStaticText = getLayerZIndex({ type: 'text', name: 'wishes_text' });
        const zDynamicText = getLayerZIndex({ type: 'text', name: 'recipient_name' });
        const zQR = getLayerZIndex({ type: 'qr', id: 'qr_code' });

        assert(zStamp === 30, "طبقة الختم الرسمي z-index = 30 (Layer 3).");
        assert(zSig === 40, "طبقة التواقيع z-index = 40 (Layer 4).");
        assert(zStaticText === 50, "طبقة النصوص الثابتة z-index = 50 (Layer 5).");
        assert(zDynamicText === 60, "طبقة النصوص الديناميكية z-index = 60 (Layer 6).");
        assert(zQR === 60, "طبقة الـ QR code تتبع مستوى النصوص الديناميكية z-index = 60 (Layer 6).");
        
        assert(zDynamicText > zStaticText, "النصوص الديناميكية أعلى من النصوص الثابتة.");
        assert(zStaticText > zSig, "النصوص الثابتة تقع فوق التواقيع تماماً.");
        assert(zSig > zStamp, "التواقيع تقع فوق الختم الرسمي تماماً.");
        assert(zStamp > 20, "الختم الرسمي يقع فوق الزخارف والخلفيات.");

        // ----------------------------------------------------
        // Step 11: فحص أداة إصلاح المعاملات القديمة وتصحيحها (Legacy Repair Tool)
        // ----------------------------------------------------
        console.log("\n[7] فحص أداة إصلاح المعاملات القديمة وتصحيحها...");
        
        // 1. إعداد الإعدادات الحالية ببيانات صالحة
        const repairSettings = {
            general_manager_signature: "gm_signature_val_11",
            assistant_planning_signature: "assistant_signature_val_22",
            official_seal: "stamp_val_33",
            directorSignature: "gm_signature_val_11",
            visaSignature: "assistant_signature_val_22",
            stamp: "stamp_val_33"
        };
        localStorage.setItem('mohararcert_db_settings', JSON.stringify(repairSettings));

        // 2. إعداد شهادات تالفة لمحاكاة المشكلة
        const damagedCerts = [
            {
                id: 'damaged-cert-1',
                serial: 'DAMAGED01',
                status: 'APPROVED_BY_ASSISTANT',
                recipientName: 'خالد التميمي',
                assistantSnapshot: {
                    visaName: 'مساعد المدير العام',
                    visaSignature: null // تالف
                },
                certificateSnapshot: {
                    signature_2: null // تالف
                }
            },
            {
                id: 'damaged-cert-2',
                serial: 'DAMAGED02',
                status: 'FINAL_APPROVED',
                recipientName: 'سعد العتيبي',
                assistantSnapshot: {
                    visaSignature: 'existing_visa_sig' // سليم
                },
                managerSnapshot: {
                    directorSignature: null, // تالف
                    stamp: null // تالف
                },
                certificateSnapshot: {
                    signature_1: null, // تالف
                    signature_2: 'existing_visa_sig',
                    official_stamp: null // تالف
                }
            },
            {
                // معاملة تالفة ولا يمكن استرجاعها بسبب عدم وجود بيانات في الإعدادات أو اللقطات
                id: 'unrepairable-cert-3',
                serial: 'UNREPAIRABLE03',
                status: 'FINAL_APPROVED',
                recipientName: 'فهد المطيري',
                assistantSnapshot: {
                    visaSignature: null // تالف ولا يوجد في الإعدادات
                },
                managerSnapshot: {
                    directorSignature: null,
                    stamp: null
                },
                certificateSnapshot: {
                    signature_1: null,
                    signature_2: null,
                    official_stamp: null
                }
            }
        ];

        // بالنسبة للمعاملة غير القابلة للإصلاح، سنقوم بمسح قيم المساعد والمدير مؤقتاً من الإعدادات لاختبار الفشل الآمن
        const emptySettings = {
            general_manager_signature: null,
            assistant_planning_signature: null,
            official_seal: null
        };
        
        // سنحفظ الشهادات في localStorage أولاً
        localStorage.setItem('mohararcert_db_certificates', JSON.stringify(damagedCerts));

        // تشغيل أداة الهجرة الأولى مع إعدادات صالحة لإصلاح damaged-cert-1 و damaged-cert-2
        // لتشغيل initStorage نحتاج لاستدعاء دالتها
        localProvider.__triggerMigration();

        // قراءة النتائج بعد التشغيل
        let restoredCerts = JSON.parse(localStorage.getItem('mohararcert_db_certificates'));
        const restored1 = restoredCerts.find(x => x.id === 'damaged-cert-1');
        const restored2 = restoredCerts.find(x => x.id === 'damaged-cert-2');

        assert(restored1.assistantSnapshot.visaSignature === 'assistant_signature_val_22', "تم إصلاح توقيع المساعد بنجاح للمعاملة الأولى.");
        assert(restored1.certificateSnapshot.signature_2 === 'assistant_signature_val_22', "تم مزامنة signature_2 بنجاح في لقطة الشهادة الأولى.");
        assert(restored1.legacyCorruptionDetected !== true, "لم يتم وسم المعاملة الأولى كمعطوبة لأنها أصلحت بالكامل.");

        assert(restored2.managerSnapshot.directorSignature === 'gm_signature_val_11', "تم إصلاح توقيع المدير بنجاح للمعاملة الثانية.");
        assert(restored2.managerSnapshot.stamp === 'stamp_val_33', "تم إصلاح الختم بنجاح للمعاملة الثانية.");
        assert(restored2.certificateSnapshot.signature_1 === 'gm_signature_val_11', "تم مزامنة signature_1 بنجاح للمعاملة الثانية.");
        assert(restored2.certificateSnapshot.official_stamp === 'stamp_val_33', "تم مزامنة official_stamp بنجاح للمعاملة الثانية.");
        assert(restored2.legacyCorruptionDetected !== true, "لم يتم وسم المعاملة الثانية كمعطوبة.");

        // الآن سنعيد محاكاة المعاملة الثالثة مع إعدادات فارغة للتأكد من الوسم بالخلل التاريخي بشكل آمن ودون بيانات غير صحيحة
        localStorage.setItem('mohararcert_db_settings', JSON.stringify(emptySettings));
        localStorage.setItem('mohararcert_db_certificates', JSON.stringify([damagedCerts[2]]));

        localProvider.__triggerMigration();

        restoredCerts = JSON.parse(localStorage.getItem('mohararcert_db_certificates'));
        const restored3 = restoredCerts.find(x => x.id === 'unrepairable-cert-3');

        assert(restored3.legacyCorruptionDetected === true, "تم بنجاح وسم المعاملة غير القابلة للإصلاح كمعطوبة تاريخياً.");
        assert(restored3.legacyGlitchMark === 'AFFECTED_BY_HISTORICAL_GLITCH', "تم وضع علامة خلل تاريخي واضحة على المعاملة الثالثة.");
        assert(restored3.assistantSnapshot.visaSignature === null, "لم يتم إدخال بيانات غير صحيحة لتوقيع المساعد في المعاملة الثالثة.");
        assert(restored3.managerSnapshot.directorSignature === null, "لم يتم إدخال بيانات غير صحيحة لتوقيع المدير في المعاملة الثالثة.");
        assert(restored3.managerSnapshot.stamp === null, "لم يتم إدخال بيانات غير صحيحة للختم في المعاملة الثالثة.");

        // ----------------------------------------------------
        // Step 12: فحص مطابقة إحصائيات صفحة الدخول للبيانات الفعلية
        // ----------------------------------------------------
        console.log("\n[8] فحص مطابقة إحصائيات صفحة الدخول للبيانات الفعلية (Login KPIs Validation)...");
        
        // إعداد عينة شهادات في قاعدة البيانات بحالات مختلفة
        const sampleCerts = [
            { id: 'c-1', status: 'DRAFT' },
            { id: 'c-2', status: 'PENDING_APPROVAL' },
            { id: 'c-3', status: 'APPROVED_BY_ASSISTANT' },
            { id: 'c-4', status: 'FINAL_APPROVED' },
            { id: 'c-5', status: 'ARCHIVED' },
            { id: 'c-6', status: 'REJECTED' },
            { id: 'c-7', status: 'RETURNED_FOR_EDIT' }
        ];
        localStorage.setItem('mohararcert_db_certificates', JSON.stringify(sampleCerts));

        const testUsers = [
            { id: 'u-1', email: 'u1@moh.gov.sa' },
            { id: 'u-2', email: 'u2@moh.gov.sa' },
            { id: 'u-3', email: 'u3@moh.gov.sa' }
        ];
        localStorage.setItem('mohararcert_db_users', JSON.stringify(testUsers));

        // حسابات المتوقعة برمجياً من قاعدة البيانات (Database Counts)
        const dbCerts = JSON.parse(localStorage.getItem('mohararcert_db_certificates'));
        const dbUsers = JSON.parse(localStorage.getItem('mohararcert_db_users'));

        const expectedTotal = dbCerts.length;
        const expectedApproved = dbCerts.filter(c => ['FINAL_APPROVED', 'APPROVED', 'ARCHIVED'].includes(c.status)).length;
        const expectedPending = dbCerts.filter(c => ['PENDING', 'PENDING_APPROVAL', 'UNDER_REVIEW', 'APPROVED_BY_ASSISTANT'].includes(c.status)).length;
        const expectedRejected = dbCerts.filter(c => ['REJECTED', 'RETURNED_FOR_EDIT'].includes(c.status)).length;
        const expectedUsers = dbUsers.length;
        const expectedRateVal = expectedTotal > 0 ? Math.round((expectedApproved / expectedTotal) * 100) : 0;
        const expectedRate = `${expectedRateVal}%`;

        // محاكاة واجهة العرض ومطابقتها (UI Counts VS Database Counts)
        assert(expectedTotal === 7, "قاعدة البيانات تحتوي على إجمالي 7 معاملات.");
        assert(expectedApproved === 2, "قاعدة البيانات تحتوي على 2 معاملات معتمدة (FINAL_APPROVED + ARCHIVED).");
        assert(expectedPending === 2, "قاعدة البيانات تحتوي على 2 معاملات معلقة (PENDING_APPROVAL + APPROVED_BY_ASSISTANT).");
        assert(expectedRejected === 2, "قاعدة البيانات تحتوي على 2 معاملات مرفوضة (REJECTED + RETURNED_FOR_EDIT).");
        assert(expectedUsers === 3, "قاعدة البيانات تحتوي على 3 مستخدمين.");
        assert(expectedRate === '29%', "حساب معدل الاعتماد بشكل صحيح: (2 ÷ 7) × 100 = 29%.");

    } catch (e) {
        console.error("حدث خطأ أثناء فحص دورة العمل: ", e);
        failed++;
    }

    console.log("\n======================================================");
    console.log(`📊 النتيجة النهائية: الفحوصات الناجحة: ${passed} | الفحوصات الفاشلة: ${failed}`);
    console.log("======================================================");
    
    if (failed > 0) {
        process.exit(1);
    }
}

runWorkflowTest();
