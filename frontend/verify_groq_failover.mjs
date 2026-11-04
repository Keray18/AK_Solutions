import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:4000/api';

const TEST_USER = {
  email: 'phase9_user1_1793263674395@skinai.in',
  password: 'DemoUser123!',
};

const ARTIFACTS_DIR = 'C:/Users/kesha/.gemini/antigravity/brain/2885b41e-c134-4a91-bbd5-73774b3689be';

function saveArtifact(sourcePath, filename) {
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, path.join(ARTIFACTS_DIR, filename));
    console.log(`  📸 Saved artifact: ${filename}`);
  }
}

async function run() {
  console.log('========================================================================');
  console.log('🚀 SKINAI — OPENAI -> GEMINI -> GROQ -> DETERMINISTIC FAILOVER AUDIT');
  console.log('========================================================================\n');

  const report = {
    backendLiveFailover: null,
    browserAttribution: null,
    securitySanitization: null,
  };

  // 1. Direct API Verification
  console.log('--- STEP 1: Testing Live Backend /api/ai/ask Provider Chain ---');
  let token = '';
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    });
    const loginJson = await loginRes.json();
    token = loginJson.data?.accessToken;
    console.log('  ✔ Authenticated User 1 with backend API');
  } catch (err) {
    console.error('  ❌ Authentication failed:', err.message);
    process.exit(1);
  }

  const askRes = await fetch(`${API_URL}/ai/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      question: 'How can I deal with dry skin in winters?',
    }),
  });

  const askJson = await askRes.json();
  const data = askJson.data;

  console.log('  ✔ Received AI ask response:');
  console.log(`    Status: ${askJson.status}`);
  console.log(`    Provider: ${data.provider}`);
  console.log(`    Model: ${data.model}`);
  console.log(`    Failed Attempts Recorded: ${data.failedAttempts ? data.failedAttempts.length : 0}`);
  if (data.failedAttempts && data.failedAttempts.length > 0) {
    data.failedAttempts.forEach((fa, idx) => {
      console.log(`      [${idx + 1}] ${fa.provider}: ${fa.reason}`);
    });
  }

  // Security check: ensure no leaked credentials
  const rawString = JSON.stringify(askJson);
  const leakedKey =
    rawString.includes('sk-proj-') ||
    rawString.includes('gsk_') ||
    rawString.includes('AIza') ||
    rawString.includes('xai-');

  report.securitySanitization = {
    noCredentialsLeaked: !leakedKey,
    noRawStackTrace: !rawString.includes('at async') && !rawString.includes('node_modules'),
  };
  console.log(`  ✔ Security Check: Credentials sanitized = ${report.securitySanitization.noCredentialsLeaked}, No stack trace = ${report.securitySanitization.noRawStackTrace}`);

  report.backendLiveFailover = {
    status: askJson.status,
    provider: data.provider,
    model: data.model,
    hasFailedAttempts: Boolean(data.failedAttempts),
    failedAttemptsCount: data.failedAttempts?.length || 0,
    failedAttemptsList: data.failedAttempts || [],
    answerLength: data.answer?.length || 0,
    personalizedGrounding: data.answer?.toLowerCase().includes('dry') && data.answer?.toLowerCase().includes('barrier'),
  };

  // 2. Browser UI Verification
  console.log('\n--- STEP 2: Testing Browser UI Provider Attribution ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // Login
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('  ✔ Logged in via browser');

  // Navigate to /ai
  await page.goto(`${BASE_URL}/ai`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[placeholder*="Ask"]', { timeout: 15000 });
  console.log('  ✔ Loaded /ai page');

  // Count current chips
  const initialCount = await page.evaluate(
    () =>
      Array.from(document.querySelectorAll('.MuiChip-root')).filter(
        (c) =>
          c.textContent?.includes('SkinAI Knowledge Engine') ||
          c.textContent?.includes('SkinAI Advisor')
      ).length
  );

  // Submit question
  const question = 'How can I deal with dry skin in winters?';
  const input = page.locator('[placeholder*="Ask"]');
  await input.fill(question);

  // Click Send
  await page.evaluate(() => {
    const sendBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Send')
    );
    if (sendBtn) sendBtn.click();
  });

  // Wait for new response
  console.log('  ⏳ Waiting for new AI Advisor response in UI...');
  await page.waitForFunction(
    (prevCount) => {
      const current = Array.from(document.querySelectorAll('.MuiChip-root')).filter(
        (c) =>
          c.textContent?.includes('SkinAI Knowledge Engine') ||
          c.textContent?.includes('SkinAI Advisor')
      ).length;
      return current > prevCount;
    },
    initialCount,
    { timeout: 45000 }
  );

  // Small delay for markdown rendering
  await page.waitForTimeout(1000);

  const screenshotPath = 'frontend/groq_failover_ui.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  saveArtifact(screenshotPath, 'groq_failover_ui.png');

  // Inspect provenance badge
  const badgeInfo = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll('.MuiChip-root'));
    const providerChips = chips.filter(
      (c) =>
        c.textContent?.includes('SkinAI Knowledge Engine') ||
        c.textContent?.includes('SkinAI Advisor')
    );
    const latestChip = providerChips[providerChips.length - 1];
    return {
      allBadges: providerChips.map((c) => c.textContent),
      latestBadge: latestChip ? latestChip.textContent : 'Not found',
    };
  });

  console.log(`  ✔ UI Provenance Badges Found:`, badgeInfo.allBadges);
  console.log(`  ✔ Latest UI Badge Displayed: "${badgeInfo.latestBadge}"`);
  report.browserAttribution = {
    badgeText: badgeInfo.latestBadge,
    allBadges: badgeInfo.allBadges,
    isCorrectlyBadged:
      badgeInfo.latestBadge.includes('SkinAI Knowledge Engine') ||
      badgeInfo.latestBadge.includes('SkinAI Advisor'),
    noInternalLeakLabel: !badgeInfo.latestBadge.includes('Grounded knowledge fallback'),
  };

  await browser.close();

  console.log('\n========================================================================');
  console.log('📊 FINAL AUDIT RESULTS:');
  console.log(JSON.stringify(report, null, 2));
  console.log('========================================================================');
}

run().catch((err) => {
  console.error('Fatal error running verification:', err);
  process.exit(1);
});

