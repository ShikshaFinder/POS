/**
 * POS Workflow End-to-End Test Script
 * 
 * Tests the complete flow:
 * 1. CRM Login → 2. Check POS → 3. POS Login → 4. Get Products → 
 * 5. Create Checkout → 6. WhatsApp → 7. Stock Check → 8. Production Planning
 * 
 * Run: npx ts-node scripts/test-pos-workflow.ts
 */

const CRM_URL = 'https://crm.flavidairysolution.com';
const POS_URL = 'https://pos.flavidairysolution.com';

const TEST_CREDENTIALS = {
    email: 'janiharsh794+it@gmail.com',
    password: 'HarshJani@#2005',
};

const TEST_PHONE = '7984140706';

interface TestResult {
    step: string;
    success: boolean;
    data?: any;
    error?: string;
    apiUsed?: string;
}

const results: TestResult[] = [];

function log(step: string, success: boolean, data?: any, error?: string, apiUsed?: string) {
    const result: TestResult = { step, success, data, error, apiUsed };
    results.push(result);

    const status = success ? '✅' : '❌';
    console.log(`\n${status} ${step}`);
    if (apiUsed) console.log(`   API: ${apiUsed}`);
    if (error) console.log(`   Error: ${error}`);
    if (data && !success) console.log(`   Response:`, JSON.stringify(data, null, 2));
}

async function fetchWithAuth(url: string, options: RequestInit = {}, cookies?: string) {
    const headers: any = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (cookies) {
        headers['Cookie'] = cookies;
    }

    const response = await fetch(url, { ...options, headers });
    const text = await response.text();

    let data;
    try {
        data = JSON.parse(text);
    } catch {
        data = { raw: text };
    }

    return {
        ok: response.ok,
        status: response.status,
        data,
        cookies: response.headers.get('set-cookie'),
    };
}

// ============ STEP 1: CRM Login ============
async function step1_crmLogin(): Promise<{ success: boolean; cookies?: string }> {
    const api = `${CRM_URL}/api/auth/callback/credentials`;

    try {
        // First, get CSRF token
        const csrfRes = await fetch(`${CRM_URL}/api/auth/csrf`);
        const csrfData = await csrfRes.json();
        const csrfToken = csrfData.csrfToken;

        // Login
        const response = await fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                email: TEST_CREDENTIALS.email,
                password: TEST_CREDENTIALS.password,
                csrfToken,
                callbackUrl: CRM_URL,
                json: 'true',
            }),
            redirect: 'manual',
        });

        const cookies = response.headers.get('set-cookie');

        if (cookies) {
            log('CRM Login', true, { hasCookies: true }, undefined, api);
            return { success: true, cookies };
        } else {
            log('CRM Login', false, { status: response.status }, 'No session cookies received', api);
            return { success: false };
        }
    } catch (error: any) {
        log('CRM Login', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 2: Check POS Locations ============
async function step2_checkPOSLocations(cookies: string): Promise<{ success: boolean; locations?: any[] }> {
    const api = `${CRM_URL}/api/pos-locations`;

    try {
        const { ok, data } = await fetchWithAuth(api, { method: 'GET' }, cookies);

        // API returns array directly, not wrapped in {locations: []}
        if (ok && Array.isArray(data)) {
            log('Check POS Locations', true, { count: data.length }, undefined, api);
            return { success: true, locations: data };
        } else if (ok && data && !data.raw) {
            // Fallback: might be wrapped object
            const locations = data.locations || data;
            if (Array.isArray(locations)) {
                log('Check POS Locations', true, { count: locations.length }, undefined, api);
                return { success: true, locations };
            }
        }
        
        log('Check POS Locations', false, data, 'No locations found or invalid response', api);
        return { success: false };
    } catch (error: any) {
        log('Check POS Locations', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 3: POS Login ============
async function step3_posLogin(): Promise<{ success: boolean; cookies?: string }> {
    const api = `${POS_URL}/api/auth/callback/credentials`;

    try {
        // Get CSRF token
        const csrfRes = await fetch(`${POS_URL}/api/auth/csrf`);
        const csrfData = await csrfRes.json();
        const csrfToken = csrfData.csrfToken;

        // Login
        const response = await fetch(api, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                email: TEST_CREDENTIALS.email,
                password: TEST_CREDENTIALS.password,
                csrfToken,
                callbackUrl: POS_URL,
                json: 'true',
            }),
            redirect: 'manual',
        });

        const cookies = response.headers.get('set-cookie');

        if (cookies) {
            log('POS Login', true, { hasCookies: true }, undefined, api);
            return { success: true, cookies };
        } else {
            log('POS Login', false, { status: response.status }, 'No session cookies received', api);
            return { success: false };
        }
    } catch (error: any) {
        log('POS Login', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 4: Get Products ============
async function step4_getProducts(cookies: string): Promise<{ success: boolean; products?: any[] }> {
    const api = `${POS_URL}/api/pos/products`;

    try {
        const { ok, data } = await fetchWithAuth(api, { method: 'GET' }, cookies);

        if (ok && data.products) {
            log('Get Products', true, { count: data.products.length }, undefined, api);
            return { success: true, products: data.products };
        } else {
            log('Get Products', false, data, 'No products found', api);
            return { success: false };
        }
    } catch (error: any) {
        log('Get Products', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 5: Create Checkout ============
async function step5_createCheckout(cookies: string, products: any[]): Promise<{ success: boolean; invoice?: any }> {
    const api = `${POS_URL}/api/pos/checkout`;

    try {
        // Select first product with stock
        const product = products.find(p => (p.currentStock || p.quantity || 0) > 0) || products[0];

        if (!product) {
            log('Create Checkout', false, null, 'No products available', api);
            return { success: false };
        }

        const checkoutData = {
            items: [{
                productId: product.id,
                quantity: 1,
                price: product.unitPrice || product.markedPrice || 100,
            }],
            customerName: 'Test Customer',
            customerPhone: TEST_PHONE,
            totalAmount: product.unitPrice || product.markedPrice || 100,
        };

        const { ok, data } = await fetchWithAuth(api, {
            method: 'POST',
            body: JSON.stringify(checkoutData),
        }, cookies);

        if (ok && data.success) {
            log('Create Checkout', true, {
                invoiceNumber: data.invoiceNumber,
                whatsAppSent: data.whatsAppSent,
            }, undefined, api);
            return { success: true, invoice: data };
        } else {
            log('Create Checkout', false, data, data.error || 'Checkout failed', api);
            return { success: false };
        }
    } catch (error: any) {
        log('Create Checkout', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 6: Check Stock ============
async function step6_checkStock(cookies: string): Promise<{ success: boolean; stocks?: any[] }> {
    const api = `${POS_URL}/api/pos/stock`;

    try {
        const { ok, data } = await fetchWithAuth(api, { method: 'GET' }, cookies);

        if (ok && data.stocks) {
            const lowStock = data.stocks.filter((s: any) => s.quantity <= (s.product?.reorderLevel || 0));
            log('Check Stock Levels', true, {
                total: data.stocks.length,
                lowStock: lowStock.length,
            }, undefined, api);
            return { success: true, stocks: data.stocks };
        } else {
            log('Check Stock Levels', false, data, 'Failed to get stock', api);
            return { success: false };
        }
    } catch (error: any) {
        log('Check Stock Levels', false, null, error.message, api);
        return { success: false };
    }
}

// ============ STEP 7: Check Production Planning API ============
async function step7_checkProductionPlanning(cookies: string): Promise<{ success: boolean }> {
    // Try multiple possible endpoints
    const possibleAPIs = [
        `${CRM_URL}/api/production/planning`,
        `${CRM_URL}/api/production-planning`,
        `${CRM_URL}/api/planning`,
        `${CRM_URL}/api/production/auto-plan`,
    ];

    for (const api of possibleAPIs) {
        try {
            const { ok, data, status } = await fetchWithAuth(api, { method: 'GET' }, cookies);

            if (status !== 404) {
                log('Production Planning API', ok, { api, status }, ok ? undefined : 'API exists but returned error', api);
                return { success: ok };
            }
        } catch (error) {
            // Continue to next API
        }
    }

    log('Production Planning API', false, null, 'API NOT FOUND - needs to be created', 'Multiple endpoints tried');
    return { success: false };
}

// ============ STEP 8: Check Low Stock Trigger ============
async function step8_checkLowStockTrigger(cookies: string): Promise<{ success: boolean }> {
    const possibleAPIs = [
        `${CRM_URL}/api/stock/alerts`,
        `${CRM_URL}/api/alerts/low-stock`,
        `${CRM_URL}/api/inventory/alerts`,
    ];

    for (const api of possibleAPIs) {
        try {
            const { ok, status } = await fetchWithAuth(api, { method: 'GET' }, cookies);

            if (status !== 404) {
                log('Low Stock Alert API', ok, { api, status }, undefined, api);
                return { success: ok };
            }
        } catch (error) {
            // Continue
        }
    }

    log('Low Stock Alert API', false, null, 'API NOT FOUND - needs to be created', 'Multiple endpoints tried');
    return { success: false };
}

// ============ MAIN TEST RUNNER ============
async function runTests() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  POS WORKFLOW END-TO-END TEST');
    console.log('  Email:', TEST_CREDENTIALS.email);
    console.log('  Test Phone:', TEST_PHONE);
    console.log('═══════════════════════════════════════════════════════');

    // Step 1: CRM Login
    const { success: crmLoginOk, cookies: crmCookies } = await step1_crmLogin();
    if (!crmLoginOk || !crmCookies) {
        console.log('\n🛑 Cannot continue without CRM login');
        return printSummary();
    }

    // Step 2: Check POS Locations
    await step2_checkPOSLocations(crmCookies);

    // Step 3: POS Login
    const { success: posLoginOk, cookies: posCookies } = await step3_posLogin();
    if (!posLoginOk || !posCookies) {
        console.log('\n🛑 Cannot continue without POS login');
        return printSummary();
    }

    // Step 4: Get Products
    const { success: productsOk, products } = await step4_getProducts(posCookies);
    if (!productsOk || !products?.length) {
        console.log('\n🛑 Cannot continue without products');
        return printSummary();
    }

    // Step 5: Create Checkout
    await step5_createCheckout(posCookies, products);

    // Step 6: Check Stock
    await step6_checkStock(posCookies);

    // Step 7: Check Production Planning API
    await step7_checkProductionPlanning(crmCookies);

    // Step 8: Check Low Stock Trigger
    await step8_checkLowStockTrigger(crmCookies);

    printSummary();
}

function printSummary() {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n  Passed: ${passed}/${results.length}`);
    console.log(`  Failed: ${failed}/${results.length}`);

    if (failed > 0) {
        console.log('\n  ❌ FAILED STEPS:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`     - ${r.step}: ${r.error}`);
            if (r.apiUsed) console.log(`       API: ${r.apiUsed}`);
        });
    }

    console.log('\n  📋 MISSING APIs TO CREATE:');
    const missingAPIs = results
        .filter(r => !r.success && r.error?.includes('NOT FOUND'))
        .map(r => r.step);

    if (missingAPIs.length > 0) {
        missingAPIs.forEach(api => console.log(`     - ${api}`));
    } else {
        console.log('     None identified (check failed steps above)');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');
}

// Run tests
runTests().catch(console.error);
