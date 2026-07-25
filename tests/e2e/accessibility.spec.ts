import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

async function expectNoSeriousViolations(page: Page) {
  await page.waitForTimeout(300);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter(
    (violation) =>
      violation.impact === "critical" || violation.impact === "serious",
  );
  expect(
    blocking,
    blocking
      .map(
        (violation) =>
          `${violation.id}: ${violation.help}\n${violation.nodes
            .map((node) => `  ${node.target.join(" ")}: ${node.failureSummary}`)
            .join("\n")}`,
      )
      .join("\n\n"),
  ).toEqual([]);
}

async function signInDemo(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await page.getByLabel("Email").fill("maya@cirqua.local");
  await page.getByLabel("Password").fill("cirqua1234");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await page.waitForURL(/\/home(?:\?|$)/, { timeout: 90_000 });
}

test.describe("serious accessibility violations", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium");
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const route of ["/sign-in", "/sign-up", "/home", "/search"]) {
    test(`public ${route}`, async ({ page }) => {
      await page.goto(route);
      await expectNoSeriousViolations(page);
    });
  }

  test("authenticated primary surfaces", async ({ page }) => {
    await signInDemo(page);
    for (const route of [
      "/home",
      "/messages",
      "/settings",
      "/settings/profile",
      "/calls",
      "/notifications",
    ]) {
      await page.goto(route);
      if (route === "/home") {
        await page
          .getByRole("textbox", { name: /Share|post|moment/i })
          .first()
          .waitFor();
      }
      await expectNoSeriousViolations(page);
    }
  });
});
