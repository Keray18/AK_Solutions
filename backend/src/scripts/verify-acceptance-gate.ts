import { db } from '../config/database.js';
import { users } from '../db/schema/users.js';
import { skinProfiles } from '../db/schema/skinProfiles.js';
import { routines, routineSteps, routineAnalyses } from '../db/schema/routines.js';
import { products } from '../db/schema/products.js';
import { recommendations } from '../db/schema/recommendations.js';
import { eq } from 'drizzle-orm';

const API_BASE = 'http://localhost:4000/api';

interface ApiResponse<T = any> {
  status?: string;
  success?: boolean;
  data?: T;
  message?: string;
  error?: any;
}

class TestClient {
  accessToken: string | null = null;
  cookies: string[] = [];

  async request<T = any>(
    path: string,
    options: {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
      skipAuth?: boolean;
    } = {}
  ): Promise<{ status: number; body: ApiResponse<T>; headers: Headers; rawText: string }> {
    const url = `${API_BASE}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    if (this.cookies.length > 0) {
      headers['Cookie'] = this.cookies.join('; ');
    }

    const res = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Capture set-cookie headers
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const newCookies = setCookie.split(',').map((c) => c.split(';')[0]?.trim()).filter(Boolean);
      for (const nc of newCookies) {
        if (nc) {
          const cookieName = nc.split('=')[0];
          this.cookies = this.cookies.filter((c) => !c.startsWith(`${cookieName}=`));
          this.cookies.push(nc);
        }
      }
    }

    const rawText = await res.text();
    let body: any = {};
    try {
      body = JSON.parse(rawText);
    } catch {
      body = { raw: rawText };
    }

    return {
      status: res.status,
      body,
      headers: res.headers,
      rawText,
    };
  }
}

async function runAcceptanceGate() {
  console.log('================================================================');
  console.log('🧴 SkinAI — Comprehensive Final Demo Acceptance Gate Verification');
  console.log('================================================================\n');

  const clientA = new TestClient();
  const clientB = new TestClient();

  const timestamp = Date.now();
  const userAEmail = `demo_gate_user_${timestamp}@skinai.in`;
  const userBEmail = `demo_gate_user_b_${timestamp}@skinai.in`;
  const testPassword = 'Password123!';

  let testCount = 0;
  let passCount = 0;
  const failures: string[] = [];

  function assert(condition: boolean, testName: string, details?: string) {
    testCount++;
    if (condition) {
      passCount++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failures.push(`${testName}: ${details || 'Assertion failed'}`);
      console.error(`  ✗ [FAIL] ${testName} - ${details || 'Assertion failed'}`);
    }
  }

  // ==========================================
  // TEST A: AUTHENTICATION
  // ==========================================
  console.log('--- TEST A: AUTHENTICATION ---');

  // 1. Register User A
  const regResA = await clientA.request('/auth/register', {
    method: 'POST',
    body: {
      email: userAEmail,
      password: testPassword,
      name: 'Demo Test User A',
    },
  });

  assert(regResA.status === 201, 'A1: Registration returns 201 Created');
  assert(!!regResA.body.data?.accessToken, 'A2: Access token returned in registration body');
  assert(regResA.body.data?.user?.email === userAEmail, 'A3: Registered user matches email');

  clientA.accessToken = regResA.body.data?.accessToken;
  const userAId = regResA.body.data?.user?.id;

  // 2. Verify persisted in DB
  const [dbUserA] = await db.select().from(users).where(eq(users.id, userAId));
  assert(!!dbUserA, 'A4: User persisted in PostgreSQL database');

  // 3. Confirm refresh cookie set
  const hasRefreshCookie = clientA.cookies.some((c) => c.startsWith('skinai_refresh='));
  assert(hasRefreshCookie, 'A5: Refresh token cookie set in response headers');

  // 4. Test session restoration via /auth/refresh
  const refreshRes = await clientA.request('/auth/refresh', {
    method: 'POST',
  });
  assert(refreshRes.status === 200, 'A6: Token refresh succeeds with cookie');
  assert(!!refreshRes.body.data?.accessToken, 'A7: Token refresh returns new access token');
  clientA.accessToken = refreshRes.body.data?.accessToken;

  // 5. Test unauthenticated rejection on protected endpoint
  const unauthRes = await clientA.request('/skin-profile', {
    skipAuth: true,
  });
  assert(unauthRes.status === 401, 'A8: Protected endpoint rejects unauthenticated request (401)');

  // 6. Test logout
  const logoutRes = await clientA.request('/auth/logout', {
    method: 'POST',
  });
  assert(logoutRes.status === 200, 'A9: Logout endpoint returns 200');

  // 7. Test login
  const loginRes = await clientA.request('/auth/login', {
    method: 'POST',
    body: {
      email: userAEmail,
      password: testPassword,
    },
  });
  assert(loginRes.status === 200, 'A10: Login succeeds with correct credentials');
  assert(!!loginRes.body.data?.accessToken, 'A11: Login returns valid access token');
  clientA.accessToken = loginRes.body.data?.accessToken;

  // 8. Test invalid login rejected
  const badLoginRes = await clientA.request('/auth/login', {
    method: 'POST',
    body: {
      email: userAEmail,
      password: 'WrongPassword!',
    },
  });
  assert(badLoginRes.status === 401, 'A12: Bad password rejected with 401');

  // ==========================================
  // TEST B: ONBOARDING
  // ==========================================
  console.log('\n--- TEST B: ONBOARDING ---');

  // 1. Initial status
  const initStatus = await clientA.request('/onboarding/status');
  assert(initStatus.status === 200, 'B1: Onboarding status endpoint reachable');
  assert(initStatus.body.data?.completed === false, 'B2: Initial onboarding status is not completed');

  // 2. Profile demographics
  const profileStepRes = await clientA.request('/onboarding/profile', {
    method: 'POST',
    body: { country: 'India', city: 'Mumbai', ageRange: '25_34', gender: 'prefer_not_to_say' },
  });
  assert(profileStepRes.status === 200, 'B3: Save profile demographics succeeds');

  // 3. Step 1: Skin type
  const skinTypeRes = await clientA.request('/onboarding/skin', {
    method: 'POST',
    body: { skinType: 'combination' },
  });
  assert(skinTypeRes.status === 200, 'B4: Save skin type succeeds');

  // 4. Step 2: Concerns
  const concernsRes = await clientA.request('/onboarding/concerns', {
    method: 'POST',
    body: {
      primary: 'acne',
      secondary: ['dullness'],
    },
  });
  assert(concernsRes.status === 200, 'B5: Save concerns succeeds');

  // 5. Step 3: Sensitivity
  const sensRes = await clientA.request('/onboarding/sensitivity', {
    method: 'POST',
    body: { sensitivity: 'medium' },
  });
  assert(sensRes.status === 200, 'B6: Save sensitivity succeeds');

  // 6. Step 4: Lifestyle
  const lifeRes = await clientA.request('/onboarding/lifestyle', {
    method: 'POST',
    body: {
      sleepQuality: 'good',
      stressLevel: 'medium',
      sunExposure: 'moderate',
    },
  });
  assert(lifeRes.status === 200, 'B7: Save lifestyle succeeds');

  // 7. Step 5: Environment
  const envRes = await clientA.request('/onboarding/environment', {
    method: 'POST',
    body: { climate: 'hot_humid' },
  });
  assert(envRes.status === 200, 'B8: Save environment succeeds');

  // 8. Step 6: Budget
  const budgetRes = await clientA.request('/onboarding/budget', {
    method: 'POST',
    body: {
      monthlyBudget: 1500,
      currency: 'INR',
      budgetFlexibility: 'flexible',
    },
  });
  assert(budgetRes.status === 200, 'B9: Save budget succeeds');

  // 9. Step 7: Routine (lookup catalog products first)
  const allProducts = await db.select().from(products).limit(5);
  const cleanserProduct = allProducts.find((p) => p.category === 'cleanser') || allProducts[0];
  const moisturizerProduct = allProducts.find((p) => p.category === 'moisturizer') || allProducts[1];
  const sunscreenProduct = allProducts.find((p) => p.category === 'sunscreen') || allProducts[2];

  // Save morning routine
  const morningRes = await clientA.request('/onboarding/routine', {
    method: 'POST',
    body: {
      routineType: 'morning',
      steps: [
        {
          productId: cleanserProduct?.id,
          category: 'cleanser',
          stepOrder: 1,
          frequency: 'daily',
        },
        {
          productId: sunscreenProduct?.id,
          category: 'sunscreen',
          stepOrder: 2,
          frequency: 'daily',
        },
      ],
    },
  });
  assert(morningRes.status === 200, 'B10: Save morning routine succeeds');

  // Save evening routine
  const eveningRes = await clientA.request('/onboarding/routine', {
    method: 'POST',
    body: {
      routineType: 'evening',
      steps: [
        {
          productId: cleanserProduct?.id,
          category: 'cleanser',
          stepOrder: 1,
          frequency: 'daily',
        },
        {
          productId: moisturizerProduct?.id,
          category: 'moisturizer',
          stepOrder: 2,
          frequency: 'daily',
        },
      ],
    },
  });
  assert(eveningRes.status === 200, 'B11: Save evening routine succeeds');

  // 10. Complete onboarding
  const completeRes = await clientA.request('/onboarding/complete', {
    method: 'POST',
  });
  assert(completeRes.status === 200, 'B12: Complete onboarding succeeds');

  // 11. Verify skin profile in DB
  const [dbProfile] = await db.select().from(skinProfiles).where(eq(skinProfiles.userId, userAId));
  assert(!!dbProfile, 'B13: Skin profile persisted in PostgreSQL');
  assert(dbProfile?.skinType === 'combination', 'B14: Persisted skin type matches combination');

  // 12. Verify GET /skin-profile
  const profileApiRes = await clientA.request('/skin-profile');
  assert(profileApiRes.status === 200, 'B15: GET /skin-profile returns profile data');
  assert(profileApiRes.body.data?.routines?.length >= 2, 'B16: Profile includes created routines');

  // ==========================================
  // TEST C: ROUTINE INTELLIGENCE
  // ==========================================
  console.log('\n--- TEST C: ROUTINE INTELLIGENCE ---');

  const userRoutinesRes = await clientA.request('/routines');
  assert(userRoutinesRes.status === 200, 'C1: GET /routines succeeds');
  const userRoutines = userRoutinesRes.body.data || [];
  assert(userRoutines.length >= 2, 'C2: User has morning and evening routines');

  const eveningRoutine = userRoutines.find((r: any) => r.routineType === 'evening') || userRoutines[0];
  const morningRoutine = userRoutines.find((r: any) => r.routineType === 'morning') || userRoutines[1];
  const routineId = eveningRoutine.id;

  // 1. Run routine analysis
  const analyzeRes = await clientA.request(`/routines/${routineId}/analyze`, {
    method: 'POST',
  });
  assert(analyzeRes.status === 200, 'C3: POST /routines/:id/analyze succeeds');
  const analysisData = analyzeRes.body.data;
  assert(typeof analysisData.overallScore === 'number', 'C4: Routine analysis returns numeric overallScore');
  assert(typeof analysisData.confidence === 'string', 'C5: Routine analysis returns confidence rating');
  assert(!!analysisData.breakdown, 'C6: Routine analysis returns 5-category breakdown');
  assert(typeof analysisData.breakdown.compatibility?.score === 'number', 'C7: Breakdown contains compatibility score');
  assert(typeof analysisData.breakdown.structure?.score === 'number', 'C8: Breakdown contains structure score');
  assert(typeof analysisData.breakdown.concernCoverage?.score === 'number', 'C9: Breakdown contains concern coverage score');
  assert(typeof analysisData.breakdown.simplicity?.score === 'number', 'C10: Breakdown contains simplicity score');
  assert(typeof analysisData.breakdown.usage?.score === 'number', 'C11: Breakdown contains usage score');

  // 2. Check persisted analysis
  const [dbAnalysis] = await db.select().from(routineAnalyses).where(eq(routineAnalyses.routineId, routineId));
  assert(!!dbAnalysis, 'C12: Routine analysis persisted in PostgreSQL');

  // 3. Check stale detection: update routine
  await clientA.request(`/routines/${routineId}`, {
    method: 'PATCH',
    body: { name: 'Updated Evening Routine' },
  });

  const staleCheckRes = await clientA.request(`/routines/${routineId}/analysis`);
  assert(staleCheckRes.status === 200, 'C13: GET /routines/:id/analysis succeeds');
  assert(staleCheckRes.body.data?.isStale === true, 'C14: Modified routine is correctly marked isStale: true');

  // 4. Re-analyze and verify stale cleared
  const reanalyzeRes = await clientA.request(`/routines/${routineId}/analyze`, {
    method: 'POST',
  });
  assert(reanalyzeRes.status === 200, 'C15: Re-analysis succeeds');
  const freshCheckRes = await clientA.request(`/routines/${routineId}/analysis`);
  assert(freshCheckRes.body.data?.isStale === false, 'C16: Re-analysis clears stale flag (isStale: false)');

  // ==========================================
  // TEST D: PRODUCT RECOMMENDATIONS
  // ==========================================
  console.log('\n--- TEST D: PRODUCT RECOMMENDATIONS ---');

  const genRecRes = await clientA.request('/recommendations/generate', {
    method: 'POST',
  });
  assert(genRecRes.status === 201, 'D1: POST /recommendations/generate returns 201 Created');
  const genData = genRecRes.body.data;
  assert(!!genData?.type, 'D2: Recommendation contains type');
  assert(Array.isArray(genData?.items), 'D3: Recommendation contains ranked items array');

  // Verify candidates come from PostgreSQL
  const [dbRec] = await db.select().from(recommendations).where(eq(recommendations.userId, userAId));
  assert(!!dbRec, 'D4: Recommendation persisted in PostgreSQL recommendations table');

  // Retrieve recommendation history
  const recHistoryRes = await clientA.request('/recommendations');
  assert(recHistoryRes.status === 200, 'D5: GET /recommendations returns history array');
  assert(recHistoryRes.body.data?.length > 0, 'D6: History contains generated recommendation');

  // Open single recommendation
  const singleRecRes = await clientA.request(`/recommendations/${dbRec.id}`);
  assert(singleRecRes.status === 200, 'D7: GET /recommendations/:id returns detailed record');
  assert(singleRecRes.body.data?.id === dbRec.id, 'D8: Detailed record matches requested ID');

  // ==========================================
  // TEST E: PRODUCT COMPARISON AND REPLACEMENT
  // ==========================================
  console.log('\n--- TEST E: PRODUCT COMPARISON AND REPLACEMENT ---');

  if (allProducts.length >= 2) {
    const prod1 = allProducts[0];
    const prod2 = allProducts[1];

    // 1. Compare 2 products
    const compRes = await clientA.request('/products/compare', {
      method: 'POST',
      body: {
        productIds: [prod1.id, prod2.id],
      },
    });
    assert(compRes.status === 200, 'E1: POST /products/compare succeeds for 2 products');
    assert(compRes.body.data?.scores?.length === 2, 'E2: Comparison returns scores for both products');
    assert(!!compRes.body.data?.decision, 'E3: Comparison returns evidence-based decision string');

    // 2. Max supported products (up to 4)
    const fourProducts = allProducts.slice(0, 4);
    if (fourProducts.length >= 3) {
      const comp4Res = await clientA.request('/products/compare', {
        method: 'POST',
        body: {
          productIds: fourProducts.map((p) => p.id),
        },
      });
      assert(comp4Res.status === 200, 'E4: Comparison supports 3-4 products smoothly');
      assert(comp4Res.body.data?.scores?.length === fourProducts.length, 'E5: Multi-product comparison scores all candidates');
    }

    // 3. Product replacement
    const replaceRes = await clientA.request(`/products/${prod1.id}/replacements`, {
      method: 'POST',
    });
    assert(replaceRes.status === 200, 'E6: POST /products/:id/replacements succeeds');
    assert(!!replaceRes.body.data?.decision, 'E7: Replacement decision returned (KEEP or REPLACE)');
  }

  // ==========================================
  // TEST F: ROUTINE OPTIMIZATION
  // ==========================================
  console.log('\n--- TEST F: ROUTINE OPTIMIZATION ---');

  // 1. Record steps before optimization
  const stepsBefore = await db.select().from(routineSteps).where(eq(routineSteps.routineId, routineId));
  const beforeStepIds = stepsBefore.map((s) => s.id).sort();

  // 2. Request preview
  const previewRes = await clientA.request(`/routines/${routineId}/optimize`, {
    method: 'POST',
  });
  assert(previewRes.status === 200, 'F1: POST /routines/:id/optimize preview succeeds');
  const optPreview = previewRes.body.data;
  assert(typeof optPreview.projectedScore === 'number', 'F2: Optimization preview contains numeric projectedScore');
  assert(Array.isArray(optPreview.changes), 'F3: Optimization preview contains changes array');

  // 3. Verify preview did NOT modify DB!
  const stepsAfterPreview = await db.select().from(routineSteps).where(eq(routineSteps.routineId, routineId));
  const afterPreviewIds = stepsAfterPreview.map((s) => s.id).sort();
  assert(
    JSON.stringify(beforeStepIds) === JSON.stringify(afterPreviewIds),
    'F4: Optimization preview does NOT mutate the database (idempotent preview)'
  );

  // 4. Apply optimization
  const applyRes = await clientA.request(`/routines/${routineId}/optimize/apply`, {
    method: 'POST',
    body: {
      changes: optPreview.changes,
    },
  });
  assert(applyRes.status === 200, 'F5: POST /routines/:id/optimize/apply succeeds');
  assert(applyRes.body.data?.success === true, 'F6: Optimization apply returns success');
  assert(!!applyRes.body.data?.newAnalysis, 'F7: Fresh routine analysis automatically generated on apply');

  // ==========================================
  // TEST G: AI / RAG ASSISTANT
  // ==========================================
  console.log('\n--- TEST G: AI / RAG ASSISTANT ---');

  // 1. Ask skincare question
  const aiAskRes = await clientA.request('/ai/ask', {
    method: 'POST',
    body: {
      question: 'What does niacinamide do and can it be paired with salicylic acid?',
    },
  });
  assert(aiAskRes.status === 200, 'G1: POST /ai/ask succeeds with HTTP 200');
  const aiData = aiAskRes.body.data;
  assert(!!aiData?.answer, 'G2: AI endpoint returns structured answer');
  assert(Array.isArray(aiData?.sources), 'G3: AI endpoint returns verified sources array');
  assert(aiData?.sources?.length > 0, 'G4: Educational knowledge records retrieved from database');

  // 2. Public knowledge endpoint
  const aiKnowledgeRes = await clientA.request('/ai/knowledge?q=niacinamide');
  assert(aiKnowledgeRes.status === 200, 'G5: GET /ai/knowledge returns 200');
  assert(aiKnowledgeRes.body.data?.length > 0, 'G6: Knowledge chunks found for query "niacinamide"');

  // ==========================================
  // TEST H: AUTHORIZATION AND DATA ISOLATION
  // ==========================================
  console.log('\n--- TEST H: AUTHORIZATION AND DATA ISOLATION ---');

  // 1. Register User B
  const regResB = await clientB.request('/auth/register', {
    method: 'POST',
    body: {
      email: userBEmail,
      password: testPassword,
      name: 'Demo Test User B',
    },
  });
  assert(regResB.status === 201, 'H1: User B registered successfully');
  clientB.accessToken = regResB.body.data?.accessToken;
  const userBId = regResB.body.data?.user?.id;

  // 2. User B creates a routine
  const routineBRes = await clientB.request('/routines', {
    method: 'POST',
    body: {
      name: "User B's Private Routine",
      routineType: 'morning',
      steps: [],
    },
  });
  assert(routineBRes.status === 201, 'H2: User B creates routine');
  const userBRoutineId = routineBRes.body.data?.id;

  // 3. User A attempts to GET User B's routine -> MUST return 404/403
  const userAToBGetRes = await clientA.request(`/routines/${userBRoutineId}`);
  assert(
    userAToBGetRes.status === 404 || userAToBGetRes.status === 403,
    'H3: User A cannot read User B routine (returns 404/403)'
  );

  // 4. User A attempts to PATCH User B's routine -> MUST return 404/403
  const userAToBPatchRes = await clientA.request(`/routines/${userBRoutineId}`, {
    method: 'PATCH',
    body: { name: 'Hacked Routine' },
  });
  assert(
    userAToBPatchRes.status === 404 || userAToBPatchRes.status === 403,
    'H4: User A cannot modify User B routine (returns 404/403)'
  );

  // 5. User A attempts to DELETE User B's routine -> MUST return 404/403
  const userAToBDeleteRes = await clientA.request(`/routines/${userBRoutineId}`, {
    method: 'DELETE',
  });
  assert(
    userAToBDeleteRes.status === 404 || userAToBDeleteRes.status === 403,
    'H5: User A cannot delete User B routine (returns 404/403)'
  );

  // 6. User A attempts to optimize User B's routine -> MUST return 404/403
  const userAToBOptRes = await clientA.request(`/routines/${userBRoutineId}/optimize/apply`, {
    method: 'POST',
    body: { changes: [] },
  });
  assert(
    userAToBOptRes.status === 404 || userAToBOptRes.status === 403,
    'H6: User A cannot apply optimization to User B routine (returns 404/403)'
  );

  // 7. Non-admin User A attempts admin operation -> MUST return 403
  const adminPostRes = await clientA.request('/products', {
    method: 'POST',
    body: {
      name: 'Unauthorized Product',
      slug: 'unauthorized-product',
      category: 'cleanser',
      price: '999',
    },
  });
  assert(adminPostRes.status === 403, 'H7: Standard user cannot create products via Admin API (403 Forbidden)');

  // 8. No SQL errors leaked
  const hasSqlLeak =
    userAToBGetRes.rawText.includes('syntax error') ||
    userAToBGetRes.rawText.includes('pg_') ||
    userAToBGetRes.rawText.includes('SELECT');
  assert(!hasSqlLeak, 'H8: Error responses do not leak SQL or database internals');

  // ==========================================
  // FINAL SUMMARY
  // ==========================================
  console.log('\n================================================================');
  console.log(`🎯 ACCEPTANCE GATE SUMMARY: ${passCount}/${testCount} TESTS PASSED`);
  console.log('================================================================');

  if (failures.length > 0) {
    console.error('\nFailures encountered:');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL ACCEPTANCE GATE JOURNEYS VERIFIED WITH 100% SUCCESS!');
    process.exit(0);
  }
}

runAcceptanceGate().catch((err) => {
  console.error('Fatal execution error in acceptance gate:', err);
  process.exit(1);
});
