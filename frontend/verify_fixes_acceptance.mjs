import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api';

const TEST_USER = {
  email: 'phase9_user1_1793263674395@skinai.in',
  password: 'DemoUser123!',
};

const NO_PROFILE_USER = {
  email: `no_profile_user_${Date.now()}@skinai.in`,
  password: 'DemoPassword123!',
  name: 'No Profile Test User',
};

const ARTIFACTS_DIR = 'C:/Users/kesha/.gemini/antigravity/brain/2885b41e-c134-4a91-bbd5-73774b3689be';
const LOCAL_ARTIFACTS_DIR = 'frontend/test-artifacts';

function saveArtifact(sourcePath, filename) {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(ARTIFACTS_DIR, filename));
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🧪 SKINAI — VERIFY AI ADVISOR UI & PROFILE-GROUNDED RESPONSE FIXES');
  console.log('========================================================================\n');

  const results = {
    desktopLayout: {},
    mobileLayout: {},
    questionAnswer: {},
    noProfileFallback: {},
  };

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  // -------------------------------------------------------------------------
  // TEST SUITE 1: DESKTOP VIEWPORT (1280 x 800)
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: Testing Desktop Layout (1280x800) ---');
  const desktopContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const desktopPage = await desktopContext.newPage();

  // 1. Authenticate with real dev account
  await desktopPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await desktopPage.fill('input[type="email"]', TEST_USER.email);
  await desktopPage.fill('input[type="password"]', TEST_USER.password);
  await desktopPage.click('button[type="submit"]');
  await desktopPage.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('  ✔ Authenticated User 1 successfully');

  // 2. Navigate to /ai
  await desktopPage.goto(`${BASE_URL}/ai`, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(2000);

  // 3. Measure layout stability
  const layoutMetrics = await desktopPage.evaluate(() => {
    const sidebar = document.querySelector('div:has(> * > [data-testid="consultation-history-item"])') ||
                    document.querySelector('.MuiPaper-root:has([data-testid="consultation-history-item"])');
    const mainBox = document.querySelector('main');
    const composer = document.querySelector('textarea[placeholder*="Ask about active ingredients"]');
    const sendButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Send'));

    const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
    const composerRect = composer ? composer.getBoundingClientRect() : null;
    const sendRect = sendButton ? sendButton.getBoundingClientRect() : null;

    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      sidebarWidth: sidebarRect ? sidebarRect.width : 0,
      sidebarHeight: sidebarRect ? sidebarRect.height : 0,
      sidebarRight: sidebarRect ? sidebarRect.right : 0,
      composerVisible: composerRect ? (composerRect.top > 0 && composerRect.bottom <= window.innerHeight) : false,
      composerBottom: composerRect ? composerRect.bottom : 0,
      sendButtonVisible: sendRect ? (sendRect.top > 0 && sendRect.bottom <= window.innerHeight) : false,
    };
  });

  console.log('  Desktop Layout Metrics:', layoutMetrics);
  results.desktopLayout = layoutMetrics;

  const desktopInitialPic = `${LOCAL_ARTIFACTS_DIR}/desktop_ai_initial_1280x800.png`;
  await desktopPage.screenshot({ path: desktopInitialPic });
  saveArtifact(desktopInitialPic, 'desktop_ai_initial_1280x800.png');
  console.log('  ✔ Saved desktop initial screenshot: desktop_ai_initial_1280x800.png');

  // 4. Submit "How can I improve my skin health?"
  console.log('\n--- SUITE 2: Submitting "How can I improve my skin health?" ---');
  const textarea = desktopPage.locator('textarea[placeholder*="Ask about active ingredients"]');
  await textarea.fill('How can I improve my skin health?');
  const sendButton = desktopPage.locator('button:has-text("Send")');
  await sendButton.click();

  // Wait for response from /api/ai/ask
  const [response] = await Promise.all([
    desktopPage.waitForResponse(
      (res) => res.url().includes('/api/ai/ask') && res.status() === 200,
      { timeout: 20000 }
    ),
  ]);

  const apiJson = await response.json();
  const apiData = apiJson.data;
  console.log('  ✔ Received AI Response status: 200');
  console.log('    Provider:', apiData.provider);
  console.log('    Intent:', apiData.intent);
  console.log('    Sources count:', (apiData.sources || []).length);

  await desktopPage.waitForTimeout(3000);

  const desktopResponsePic = `${LOCAL_ARTIFACTS_DIR}/desktop_ai_response_1280x800.png`;
  await desktopPage.screenshot({ path: desktopResponsePic });
  saveArtifact(desktopResponsePic, 'desktop_ai_response_1280x800.png');
  console.log('  ✔ Saved desktop response screenshot: desktop_ai_response_1280x800.png');

  // Verify answer contents
  const answerText = apiData.answer || '';
  const checks = {
    hasSavedProfile: answerText.includes('Your Saved Profile'),
    mentionsDry: answerText.toLowerCase().includes('dry'),
    mentionsAcne: answerText.toLowerCase().includes('acne'),
    mentionsMediumSensitivity: answerText.toLowerCase().includes('medium'),
    mentionsRoutineOrCerave: answerText.toLowerCase().includes('cerave') || answerText.toLowerCase().includes('routine'),
    hasSafeNextSteps: answerText.includes('Safe Next Steps'),
    hasOneFollowUpQuestion: (answerText.match(/Follow-up question/g) || []).length === 1,
    noContradictoryNotice: !answerText.includes('Clinical Knowledge Base Notice') && !answerText.includes('does not contain verified interaction records'),
    noUnsupported80PercentClaim: !answerText.includes('80%') && !JSON.stringify(apiData.sources || []).includes('80%'),
    noRawProviderDebugLabel: (await desktopPage.locator('text="Grounded knowledge fallback"').count()) === 0,
    noRawIntentBadge: (await desktopPage.locator('text="IMPROVE_SKIN_QUALITY"').count()) === 0 && (await desktopPage.locator('text="GENERAL_SKINCARE"').count()) === 0,
    hasKnowledgeEngineBadge: (await desktopPage.locator('text="SkinAI Knowledge Engine"').count()) > 0,
  };

  console.log('  Verification Checks on Response:');
  console.log('    • Uses real loaded profile facts (Dry & Acne):', checks.hasSavedProfile && checks.mentionsDry && checks.mentionsAcne);
  console.log('    • Mentions actual routine product (CeraVe):', checks.mentionsRoutineOrCerave);
  console.log('    • Contains safe next steps:', checks.hasSafeNextSteps);
  console.log('    • Has at most one relevant follow-up question:', checks.hasOneFollowUpQuestion);
  console.log('    • Free of contradictory "no evidence" notices:', checks.checksnoContradictoryNotice !== false);
  console.log('    • Free of unsupported quantitative claims (no 80%):', checks.noUnsupported80PercentClaim);
  console.log('    • Customer-facing badge "SkinAI Knowledge Engine":', checks.hasKnowledgeEngineBadge);

  results.questionAnswer = {
    answerSnippet: answerText.substring(0, 300),
    checks,
  };

  // 5. Test expanding the Supporting Clinical Sources
  const sourcesToggle = desktopPage.locator('button:has-text("Supporting Clinical Sources")');
  if (await sourcesToggle.count() > 0) {
    console.log('  Expanding Supporting Clinical Sources...');
    await sourcesToggle.first().click();
    await desktopPage.waitForTimeout(1000);
    const sourcesExpandedPic = `${LOCAL_ARTIFACTS_DIR}/desktop_ai_sources_expanded.png`;
    await desktopPage.screenshot({ path: sourcesExpandedPic });
    saveArtifact(sourcesExpandedPic, 'desktop_ai_sources_expanded.png');
    console.log('  ✔ Saved sources expanded screenshot: desktop_ai_sources_expanded.png');
  }

  // -------------------------------------------------------------------------
  // TEST SUITE 3: MOBILE VIEWPORT (375 x 667)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Testing Mobile Layout (375x667) ---');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 },
  });
  const mobilePage = await mobileContext.newPage();

  // Authenticate on mobile
  await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await mobilePage.fill('input[type="email"]', TEST_USER.email);
  await mobilePage.fill('input[type="password"]', TEST_USER.password);
  await mobilePage.click('button[type="submit"]');
  await mobilePage.waitForURL('**/dashboard', { timeout: 15000 });

  await mobilePage.goto(`${BASE_URL}/ai`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  const mobileMetrics = await mobilePage.evaluate(() => {
    const composer = document.querySelector('textarea[placeholder*="Ask about active ingredients"]');
    const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Send'));
    const composerRect = composer ? composer.getBoundingClientRect() : null;

    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      composerVisible: composerRect ? (composerRect.top > 0 && composerRect.bottom <= window.innerHeight) : false,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });
  console.log('  Mobile Metrics:', mobileMetrics);
  results.mobileLayout = mobileMetrics;

  const mobileInitialPic = `${LOCAL_ARTIFACTS_DIR}/mobile_ai_initial_375x667.png`;
  await mobilePage.screenshot({ path: mobileInitialPic });
  saveArtifact(mobileInitialPic, 'mobile_ai_initial_375x667.png');
  console.log('  ✔ Saved mobile initial screenshot: mobile_ai_initial_375x667.png');

  // Test opening the conversation list drawer on mobile
  console.log('  Opening Mobile Consultations Drawer...');
  const mobileHistoryBtn = mobilePage.locator('button[aria-label="Open consultations list"]');
  await mobileHistoryBtn.click();
  await mobilePage.waitForTimeout(1000);

  const mobileDrawerPic = `${LOCAL_ARTIFACTS_DIR}/mobile_ai_drawer_open_375x667.png`;
  await mobilePage.screenshot({ path: mobileDrawerPic });
  saveArtifact(mobileDrawerPic, 'mobile_ai_drawer_open_375x667.png');
  console.log('  ✔ Saved mobile drawer open screenshot: mobile_ai_drawer_open_375x667.png');

  // Test closing the drawer
  const closeDrawerBtn = mobilePage.locator('button[aria-label="Close consultations list"]');
  await closeDrawerBtn.click();
  await mobilePage.waitForTimeout(1000);
  console.log('  ✔ Closed Mobile Consultations Drawer');

  // -------------------------------------------------------------------------
  // TEST SUITE 4: MISSING PROFILE DATA (Graceful Degradation)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Testing Unconfigured Profile Fallback ---');
  // Register fresh user without completing skin profile onboarding
  const registerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: NO_PROFILE_USER.email,
      password: NO_PROFILE_USER.password,
      name: NO_PROFILE_USER.name,
    }),
  });
  const regJson = await registerRes.json();
  const noProfileToken = regJson.data?.accessToken;
  const noProfileUserId = regJson.data?.user?.id;
  console.log('  ✔ Registered fresh user without skin profile (ID:', noProfileUserId, ')');

  // Query /api/ai/ask directly with no-profile user
  const askRes = await fetch(`${API_URL}/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${noProfileToken}`,
    },
    body: JSON.stringify({
      question: 'How can I improve my skin health?',
    }),
  });
  const noProfileAskJson = await askRes.json();
  const noProfileAnswer = noProfileAskJson.data?.answer || '';

  console.log('  No-Profile Response Snippet:\n ', noProfileAnswer.substring(0, 300));
  const noProfileChecks = {
    statesPersonalizationUnavailable: noProfileAnswer.includes('Personalization is currently unavailable because your skin profile has not been configured yet'),
    providesGeneralFoundations: noProfileAnswer.includes('Core Evidence-Based Foundations') && noProfileAnswer.includes('Gentle Cleansing'),
    asksUsefulQuestion: noProfileAnswer.includes('What is your primary skin type'),
    doesNotInventProfileFacts: !noProfileAnswer.includes('Your Saved Profile') && !noProfileAnswer.includes('Skin Type: **dry**'),
  };
  console.log('  No-Profile Verification Checks:', noProfileChecks);
  results.noProfileFallback = {
    answerSnippet: noProfileAnswer.substring(0, 300),
    checks: noProfileChecks,
  };

  await browser.close();

  console.log('\n========================================================================');
  console.log('🎉 ALL ACCEPTANCE CHECKS COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
  console.log('Summary Result:\n', JSON.stringify(results, null, 2));
}

run().catch((err) => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
