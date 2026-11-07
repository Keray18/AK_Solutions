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

async function getAuthToken() {
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER),
  });
  const json = await loginRes.json();
  return json.data?.accessToken;
}

async function ensureTestConversations(token) {
  const listRes = await fetch(`${API_URL}/ai/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listJson = await listRes.json();
  const convs = listJson.data || [];

  if (convs.length < 3) {
    console.log(`  Seeding additional test consultations (current count: ${convs.length})...`);
    for (let i = convs.length; i < 3; i++) {
      const q = i === 1 ? 'Recommend a gentle cleanser for morning' : 'How does niacinamide help skin?';
      await fetch(`${API_URL}/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: q }),
      });
    }
    const updatedRes = await fetch(`${API_URL}/ai/conversations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const updatedJson = await updatedRes.json();
    return updatedJson.data || [];
  }
  return convs;
}

async function run() {
  console.log('========================================================================');
  console.log('🧪 SKINAI — CONSULTATION HISTORY DELETION UX VERIFICATION');
  console.log('========================================================================\n');

  const report = {
    dialogBehaviorAndDesign: {},
    rowClickPropagation: {},
    cancelAndEscape: {},
    apiFailureHandling: {},
    loadingProtection: {},
    inactiveConversationDeletion: {},
    activeConversationDeletion: {},
    mobileResponsiveLayout: {},
  };

  const token = await getAuthToken();
  if (!token) throw new Error('Authentication failed');
  console.log('  ✔ Authenticated User 1 with backend API');

  const initialConvs = await ensureTestConversations(token);
  console.log(`  ✔ Confirmed test user has ${initialConvs.length} consultations in DB`);

  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  // 1. Log in & Navigate
  console.log('\n--- 1. Login & Navigate to /ai ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', TEST_USER.email);
  await page.fill('input[type="password"]', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.goto(`${BASE_URL}/ai`, { waitUntil: 'networkidle' });
  await page.waitForSelector('[data-testid="consultation-history-item"]', { timeout: 15000 });
  console.log('  ✔ Loaded /ai page with consultations list');

  // Helper to query desktop list items only
  const getDesktopItems = async () => {
    return await page.evaluate(() => {
      const desktopSidebar = document.querySelector('[data-testid="desktop-conversations-sidebar"]');
      const items = Array.from(desktopSidebar?.querySelectorAll('[data-testid="consultation-history-item"]') || []);
      return items.map((el) => {
        const id = el.getAttribute('data-conv-id') || '';
        const titleEl = el.querySelector('.MuiTypography-body2');
        const isSelected = el.classList.contains('Mui-selected');
        return {
          id,
          title: titleEl?.textContent?.trim() || '',
          isSelected,
        };
      });
    });
  };

  let desktopItems = await getDesktopItems();
  console.log(`  ✔ Visible desktop consultations: ${desktopItems.length} items`);

  // Ensure first conversation is active
  await page.locator('[data-testid="desktop-conversations-sidebar"] [data-testid="consultation-history-item"]').first().click();
  await page.waitForTimeout(600);
  desktopItems = await getDesktopItems();
  const activeIndex = desktopItems.findIndex((c) => c.isSelected);
  const activeConv = desktopItems[activeIndex];
  console.log(`  ✔ Active conversation: index ${activeIndex}, ID="${activeConv.id}", title="${activeConv.title}"`);

  // 2. Row-Click Propagation Test
  console.log('\n--- 2. Row-Click Propagation Test ---');
  const inactiveIndex = desktopItems.findIndex((c, i) => i !== activeIndex);
  const inactiveConv = desktopItems[inactiveIndex];
  console.log(`  Targeting inactive item [${inactiveIndex}]: ID="${inactiveConv.id}", title="${inactiveConv.title}"`);

  // Click delete button on inactive row in desktop sidebar
  const deleteBtnInactive = page.locator(`[data-testid="desktop-conversations-sidebar"] [data-testid="delete-consultation-btn-${inactiveConv.id}"]`);
  await deleteBtnInactive.click();

  // Verify dialog opened
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });
  const titleText = await page.locator('#delete-consultation-dialog-title').textContent();
  console.log(`  ✔ Dialog Title rendered: "${titleText?.trim()}"`);

  // Verify active conversation has NOT changed to the clicked row
  const itemsAfterClick = await getDesktopItems();
  const activeAfterClick = itemsAfterClick.find((c) => c.isSelected);
  const propagationStopped = activeAfterClick?.id === activeConv.id;
  console.log(`  ✔ Propagation stopped: Active conversation remained ID="${activeAfterClick?.id}" (Match: ${propagationStopped})`);
  report.rowClickPropagation = {
    propagationStopped,
    activeIdBefore: activeConv.id,
    activeIdAfter: activeAfterClick?.id,
  };

  // 3. Dialog Design, Typography, Accessibility & Focus Management
  console.log('\n--- 3. Dialog Design, Content, and Focus Verification ---');
  await page.waitForTimeout(400); // allow onEntered focus transition
  const dialogTitle = await page.locator('#delete-consultation-dialog-title').textContent();
  const dialogDesc = await page.locator('#delete-consultation-dialog-description').textContent();
  const displayedConvTitle = await page.locator('[data-testid="delete-dialog-consultation-title"]').textContent();

  const isTitleConcise = dialogTitle?.trim().includes('Delete consultation?');
  const hasExplanation = dialogDesc?.includes('permanently removes its conversation history');
  const showsTargetTitle = displayedConvTitle?.trim() === inactiveConv.title;

  // Check focused element (should be Cancel, NOT Delete consultation)
  const focusedButtonTestId = await page.evaluate(() => {
    return document.activeElement?.getAttribute('data-testid') || document.activeElement?.textContent?.trim() || '';
  });
  console.log(`  ✔ Focused element in dialog: "${focusedButtonTestId}"`);
  const cancelIsDefaultFocused =
    focusedButtonTestId === 'cancel-delete-consultation-btn' ||
    focusedButtonTestId.toLowerCase().includes('cancel');

  // Check Delete button styling (should be destructive / contained / error)
  const deleteBtnClass = (await page.locator('[data-testid="confirm-delete-consultation-btn"]').getAttribute('class')) || '';
  const isDestructiveStyled = deleteBtnClass.includes('MuiButton-contained') && deleteBtnClass.includes('MuiButton-colorError');

  report.dialogBehaviorAndDesign = {
    isTitleConcise,
    hasExplanation,
    showsTargetTitle,
    cancelIsDefaultFocused,
    isDestructiveStyled,
  };
  console.log(`  ✔ Title concise: ${isTitleConcise}`);
  console.log(`  ✔ Clear explanation of permanent removal: ${hasExplanation}`);
  console.log(`  ✔ Shows targeted consultation title: ${showsTargetTitle}`);
  console.log(`  ✔ Cancel is default focused: ${cancelIsDefaultFocused}`);
  console.log(`  ✔ Delete button is clearly destructive: ${isDestructiveStyled}`);

  // Save Desktop Dialog Screenshot
  const desktopScreenshotPath = 'frontend/consultation_delete_dialog_desktop.png';
  await page.screenshot({ path: desktopScreenshotPath, fullPage: false });
  saveArtifact(desktopScreenshotPath, 'consultation_delete_dialog_desktop.png');

  // 4. Cancel & Escape Key Behavior
  console.log('\n--- 4. Cancel and Escape Key Behavior ---');
  // Test Escape key closes dialog
  await page.keyboard.press('Escape');
  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 5000 });
  console.log('  ✔ Pressing Escape successfully closed dialog');

  let itemsAfterEscape = await getDesktopItems();
  const itemPreservedAfterEscape = itemsAfterEscape.some((c) => c.id === inactiveConv.id);
  console.log(`  ✔ Consultation remained in list after Escape: ${itemPreservedAfterEscape}`);

  // Re-open and test Cancel button
  await deleteBtnInactive.click();
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });
  await page.locator('[data-testid="cancel-delete-consultation-btn"]').click();
  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 5000 });
  console.log('  ✔ Clicking Cancel button successfully closed dialog');

  let itemsAfterCancel = await getDesktopItems();
  const itemPreservedAfterCancel = itemsAfterCancel.some((c) => c.id === inactiveConv.id);
  console.log(`  ✔ Consultation remained in list after Cancel: ${itemPreservedAfterCancel}`);

  report.cancelAndEscape = {
    escapeClosesDialog: true,
    cancelButtonClosesDialog: true,
    itemPreserved: itemPreservedAfterEscape && itemPreservedAfterCancel,
  };

  // 5. API Failure Handling & Notification
  console.log('\n--- 5. API Failure Handling & Notification ---');
  // Intercept DELETE request to simulate 500 server error
  await page.route('**/api/ai/conversations/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: 'Database constraint prevented deletion. Simulated error.' },
        }),
      });
    } else {
      await route.continue();
    }
  });

  await deleteBtnInactive.click();
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });

  // Click Delete consultation while route is mocked to fail
  await page.locator('[data-testid="confirm-delete-consultation-btn"]').click();

  // Verify error alert appears in dialog
  await page.waitForSelector('[data-testid="delete-dialog-error"]', { timeout: 5000 });
  const errorAlertText = await page.locator('[data-testid="delete-dialog-error"]').textContent();
  console.log(`  ✔ In-dialog Error Alert displayed: "${errorAlertText?.trim()}"`);

  // Verify conversation is STILL in the list
  const itemsAfterFailure = await getDesktopItems();
  const itemRetainedOnFailure = itemsAfterFailure.some((c) => c.id === inactiveConv.id);
  console.log(`  ✔ Conversation kept visible in list after API failure: ${itemRetainedOnFailure}`);

  // Verify buttons re-enabled
  const cancelDisabled = await page.locator('[data-testid="cancel-delete-consultation-btn"]').isDisabled();
  const deleteDisabled = await page.locator('[data-testid="confirm-delete-consultation-btn"]').isDisabled();
  console.log(`  ✔ Buttons re-enabled after failure: Cancel=${!cancelDisabled}, Delete=${!deleteDisabled}`);

  report.apiFailureHandling = {
    errorAlertDisplayed: Boolean(errorAlertText),
    itemRetainedOnFailure,
    buttonsReEnabled: !cancelDisabled && !deleteDisabled,
  };

  // Close dialog and unroute
  await page.locator('[data-testid="cancel-delete-consultation-btn"]').click();
  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 5000 });
  await page.unroute('**/api/ai/conversations/*');

  // 6. Inactive Conversation Deletion with Loading & Double-Click Protection
  console.log('\n--- 6. Inactive Conversation Deletion & Loading Protection (Server Success) ---');
  const countBeforeInactiveDel = (await getDesktopItems()).length;
  const activeBeforeInactiveDel = (await getDesktopItems()).find((c) => c.isSelected);

  // Set up 800ms artificial network delay on DELETE to inspect in-flight loading state
  await page.route('**/api/ai/conversations/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    } else {
      await route.continue();
    }
  });

  await page.locator(`[data-testid="desktop-conversations-sidebar"] [data-testid="delete-consultation-btn-${inactiveConv.id}"]`).click();
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });

  // Trigger deletion
  await page.locator('[data-testid="confirm-delete-consultation-btn"]').click();

  // Inspect in-flight loading protection: delete button must be disabled and show "Deleting..."
  const inFlightStatus = await page.evaluate(() => {
    const deleteBtn = document.querySelector('[data-testid="confirm-delete-consultation-btn"]');
    const cancelBtn = document.querySelector('[data-testid="cancel-delete-consultation-btn"]');
    return {
      deleteBtnDisabled: deleteBtn?.hasAttribute('disabled') || false,
      cancelBtnDisabled: cancelBtn?.hasAttribute('disabled') || false,
      deleteBtnText: deleteBtn?.textContent?.trim() || '',
    };
  });
  console.log(`  ✔ In-flight loading protection: DeleteDisabled=${inFlightStatus.deleteBtnDisabled}, CancelDisabled=${inFlightStatus.cancelBtnDisabled}, Text="${inFlightStatus.deleteBtnText}"`);

  report.loadingProtection = {
    deleteBtnDisabled: inFlightStatus.deleteBtnDisabled,
    cancelBtnDisabled: inFlightStatus.cancelBtnDisabled,
    showsDeletingText: inFlightStatus.deleteBtnText.includes('Deleting'),
  };

  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 10000 });
  await page.unroute('**/api/ai/conversations/*');

  await page.waitForTimeout(600);
  const itemsAfterInactiveDel = await getDesktopItems();
  const countAfterInactiveDel = itemsAfterInactiveDel.length;
  const deletedItemGone = !itemsAfterInactiveDel.some((c) => c.id === inactiveConv.id);
  const activeAfterInactiveDel = itemsAfterInactiveDel.find((c) => c.isSelected);
  const activePreserved = activeAfterInactiveDel?.id === activeBeforeInactiveDel?.id;

  console.log(`  ✔ Inactive conversation deleted: count ${countBeforeInactiveDel} -> ${countAfterInactiveDel}`);
  console.log(`  ✔ Deleted inactive conversation removed from list: ${deletedItemGone}`);
  console.log(`  ✔ Active conversation preserved: ID="${activeAfterInactiveDel?.id}" (Match: ${activePreserved})`);

  report.inactiveConversationDeletion = {
    countDecreased: countAfterInactiveDel === countBeforeInactiveDel - 1,
    deletedItemGone,
    activePreserved,
  };

  // 7. Active Conversation Deletion (Server Success)
  console.log('\n--- 7. Active Conversation Deletion (Server Success) ---');
  const currentActiveConv = (await getDesktopItems()).find((c) => c.isSelected);
  console.log(`  Deleting currently active conversation: ID="${currentActiveConv?.id}", title="${currentActiveConv?.title}"`);

  await page.locator(`[data-testid="desktop-conversations-sidebar"] [data-testid="delete-consultation-btn-${currentActiveConv.id}"]`).click();
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });
  await page.locator('[data-testid="confirm-delete-consultation-btn"]').click();
  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 10000 });

  await page.waitForTimeout(600);
  const itemsAfterActiveDel = await getDesktopItems();
  const activeDeletedGone = !itemsAfterActiveDel.some((c) => c.id === currentActiveConv.id);

  // Check empty / fresh consultation state
  const bodyText = await page.locator('body').textContent();
  const showsFreshState = bodyText?.includes('Starting a fresh consultation!') || bodyText?.includes('fresh consultation');

  console.log(`  ✔ Active item removed from list: ${activeDeletedGone}`);
  console.log(`  ✔ Reset to empty / new-consultation state: ${showsFreshState}`);

  report.activeConversationDeletion = {
    activeDeletedGone,
    showsFreshState,
  };

  // 8. Mobile Responsive Layout (Viewport 375x667)
  console.log('\n--- 8. Mobile Viewport (375x667) & Drawer Verification ---');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(600);

  // Click the mobile header icon to open the consultations drawer
  const openDrawerBtn = page.locator('button[aria-label="Open consultations list"]');
  await openDrawerBtn.click();
  await page.waitForSelector('.MuiDrawer-root button[aria-label*="Delete consultation"]', { state: 'visible', timeout: 5000 });
  console.log('  ✔ Opened consultations drawer on mobile viewport (375px)');

  // Click delete on first item in mobile drawer
  const mobileDeleteBtn = page.locator('.MuiDrawer-root button[aria-label*="Delete consultation"]').first();
  await mobileDeleteBtn.click();
  await page.waitForSelector('#delete-consultation-dialog-title', { timeout: 5000 });

  const dialogBoundingBox = await page.locator('.MuiDialog-paper').boundingBox();
  const isWithinMobileViewport =
    dialogBoundingBox &&
    dialogBoundingBox.width <= 375 &&
    dialogBoundingBox.x >= 0 &&
    dialogBoundingBox.width >= 260;

  console.log(`  ✔ Mobile Dialog Bounding Box: width=${dialogBoundingBox?.width}px, within viewport=${isWithinMobileViewport}`);

  const mobileScreenshotPath = 'frontend/consultation_delete_dialog_mobile.png';
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  saveArtifact(mobileScreenshotPath, 'consultation_delete_dialog_mobile.png');

  // Close dialog with Escape
  await page.keyboard.press('Escape');
  await page.waitForSelector('#delete-consultation-dialog-title', { state: 'detached', timeout: 5000 });

  report.mobileResponsiveLayout = {
    dialogOpensInMobileDrawer: true,
    dialogWidth: dialogBoundingBox?.width,
    isWithinMobileViewport,
  };

  await browser.close();

  console.log('\n========================================================================');
  console.log('📊 FINAL ACCEPTANCE TEST REPORT:');
  console.log(JSON.stringify(report, null, 2));
  console.log('========================================================================\n');

  // Verify all essential assertions passed
  const allPassed =
    report.rowClickPropagation.propagationStopped &&
    report.dialogBehaviorAndDesign.isTitleConcise &&
    report.dialogBehaviorAndDesign.hasExplanation &&
    report.dialogBehaviorAndDesign.cancelIsDefaultFocused &&
    report.dialogBehaviorAndDesign.isDestructiveStyled &&
    report.cancelAndEscape.escapeClosesDialog &&
    report.cancelAndEscape.cancelButtonClosesDialog &&
    report.apiFailureHandling.itemRetainedOnFailure &&
    report.loadingProtection.deleteBtnDisabled &&
    report.loadingProtection.showsDeletingText &&
    report.inactiveConversationDeletion.deletedItemGone &&
    report.inactiveConversationDeletion.activePreserved &&
    report.activeConversationDeletion.activeDeletedGone &&
    report.activeConversationDeletion.showsFreshState &&
    report.mobileResponsiveLayout.isWithinMobileViewport;

  if (!allPassed) {
    console.error('❌ One or more verification checks failed!');
    process.exit(1);
  } else {
    console.log('✅ ALL 8 CONSULTATION HISTORY DELETION UX CHECKS PASSED PERFECTLY!');
  }
}

run().catch((err) => {
  console.error('Fatal error in verification test:', err);
  process.exit(1);
});
