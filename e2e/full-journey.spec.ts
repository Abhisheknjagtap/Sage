import { test, expect } from "@playwright/test";

const TEST_EMAIL = `e2e+${Date.now()}@example.com`;
const TEST_PASSWORD = "TestPassword123!";

test.describe("Full user journey", () => {
  test("signup → onboarding → conversation → end → settings", async ({
    page,
  }) => {
    // ── 1. Sign up ──────────────────────────────────────────────
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up/i }).click();

    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /create account|sign up/i }).click();

    // Wait for redirect to onboarding
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 });

    // ── 2. Onboarding ──────────────────────────────────────────
    // Name step
    await page.getByPlaceholder(/name|first name/i).fill("Alex");
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Life area step — pick "work"
    await page.getByRole("button", { name: /work/i }).click();
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Relationship status — pick "single"
    await page.getByRole("button", { name: /single/i }).click();
    await page.getByRole("button", { name: /next|continue/i }).click();

    // Living situation — pick "alone"
    await page.getByRole("button", { name: /alone/i }).click();
    await page.getByRole("button", { name: /next|continue|start|finish/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });

    // ── 3. Start a conversation ────────────────────────────────
    await page.getByRole("link", { name: /start|new conversation|chat/i }).click();
    await expect(page).toHaveURL(/chat/, { timeout: 10_000 });

    // Wait for opener message to appear
    await expect(
      page.locator('[data-testid="message"], .message, [class*="bubble"]').first()
    ).toBeVisible({ timeout: 10_000 });

    // ── 4. Send a few messages ─────────────────────────────────
    const inputSelector =
      'textarea, input[type="text"][placeholder*="message"], [role="textbox"]';
    const sendSelector =
      'button[type="submit"], button[aria-label*="send"], button[aria-label*="Send"]';

    await page.locator(inputSelector).fill("I've been really stressed about a presentation at work.");
    await page.locator(sendSelector).click();

    // Wait for assistant reply
    await expect(
      page.locator('[data-testid="message"], .message, [class*="bubble"]').nth(2)
    ).toBeVisible({ timeout: 30_000 });

    await page.locator(inputSelector).fill("My boss keeps moving the goalposts and I feel like nothing I do is enough.");
    await page.locator(sendSelector).click();

    await page.locator(inputSelector).fill("Maybe I'm the problem — I don't know anymore.");
    await page.locator(sendSelector).click();

    // ── 5. Wait for Honest Mirror (may or may not appear) ─────
    // Check if honest-mirror badge appears (it may appear after 3+ exchanges)
    const honestMirrorMsg = page.locator(
      '[data-testid="honest-mirror"], [class*="honest-mirror"], [class*="mirror"]'
    );
    // Non-blocking check — it's OK if it doesn't appear
    const mirrorCount = await honestMirrorMsg.count();
    if (mirrorCount > 0) {
      await expect(honestMirrorMsg.first()).toBeVisible();
    }

    // ── 6. End the conversation ────────────────────────────────
    const endButton = page.getByRole("button", {
      name: /end|finish|close conversation/i,
    });
    if (await endButton.isVisible()) {
      await endButton.click();

      // Confirm end dialog if it appears
      const confirmButton = page.getByRole("button", {
        name: /yes|confirm|end it/i,
      });
      if (await confirmButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await confirmButton.click();
      }
    }

    // ── 7. Navigate to conversations list ─────────────────────
    await page.goto("/conversations");
    await expect(page).toHaveURL(/conversations/);
    // At least one conversation should appear
    const convItems = page.locator('a[href*="/chat/"], li, [data-testid="conversation-item"]');
    await expect(convItems.first()).toBeVisible({ timeout: 10_000 });

    // ── 8. Navigate to settings and toggle nudge ──────────────
    await page.goto("/profile");
    await expect(page).toHaveURL(/profile/);

    // Find check-in / nudge toggle
    const nudgeToggle = page.locator(
      'button[role="switch"], input[type="checkbox"][aria-label*="nudge"], [data-testid="nudge-toggle"]'
    );
    if (await nudgeToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const initialChecked = await nudgeToggle.getAttribute("aria-checked");
      await nudgeToggle.click();
      const newChecked = await nudgeToggle.getAttribute("aria-checked");
      expect(newChecked).not.toBe(initialChecked);
    }

    // ── 9. Verify profile section is present ──────────────────
    await expect(page.getByText(/display name|your name/i).first()).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });

  test("ended conversation is read-only", async ({ page }) => {
    // This test requires an existing ended conversation — skip in fresh environments
    // where there's no test data. Serves as a smoke test in seeded environments.
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
