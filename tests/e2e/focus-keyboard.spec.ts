import { expect, type Locator, type Page, test } from "@playwright/test";

async function typeWithoutLosingFocus(
  page: Page,
  field: Locator,
  value: string,
  expectedValue = value,
) {
  await field.click();
  await expect(field).toBeFocused();
  for (const character of value) {
    await page.keyboard.type(character);
    await expect(field).toBeFocused();
  }
  await expect(field).toHaveValue(expectedValue);
}

async function signInDemo(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Email" }).click();
  await page.getByLabel("Email").fill("maya@cirqua.local");
  await page.getByLabel("Password").fill("cirqua1234");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await page.waitForURL(/\/home(?:\?|$)/, { timeout: 90_000 });
}

test("email and phone authentication fields retain focus", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Continue with Email" }).click();

  const email = page.getByLabel("Email");
  await typeWithoutLosingFocus(page, email, "focus@example.com");
  await page.keyboard.press("Tab");
  const password = page.getByLabel("Password");
  await expect(password).toBeFocused();
  await typeWithoutLosingFocus(page, password, "StablePass9!");

  await page.getByRole("button", { name: "All sign-in methods" }).click();
  await page.getByRole("button", { name: "Continue with Phone" }).click();
  const phone = page.getByLabel("Phone number");
  await typeWithoutLosingFocus(page, phone, "2025550199", "+1 (202) 555-0199");
});

test("search autocomplete does not steal typing focus", async ({ page }) => {
  await page.goto("/search");
  const search = page.getByRole("combobox", { name: "Search Relune" });
  await typeWithoutLosingFocus(page, search, "maya");
  await page.waitForTimeout(500);
  await expect(search).toBeFocused();
  await expect(search).toHaveValue("maya");
});

test("tabs support arrow, Home, and End keyboard navigation", async ({
  page,
}) => {
  await page.goto("/search");
  const search = page.getByRole("combobox", { name: "Search Relune" });
  await search.fill("maya");
  await search.press("Enter");
  const all = page.getByRole("tab", { name: "All" });
  await all.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "People" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "People" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Hashtags" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(all).toBeFocused();
});

test("guest dialog traps focus, closes once, and restores its trigger", async ({
  page,
}) => {
  await page.goto("/home");
  const trigger = page
    .getByRole("button", { name: /Join(?: Relune)?/ })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: /Create an account or sign in/,
  });
  await expect(dialog).toBeVisible();

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    const focusInside = await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    );
    expect(focusInside).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("new-message modal remains stable while results update", async ({
  page,
}) => {
  await signInDemo(page);
  await page.goto("/messages");
  const trigger = page.getByRole("button", { name: "New message" }).first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "New message" });
  await expect(dialog).toBeVisible();
  const search = dialog.getByPlaceholder("Search people");
  await typeWithoutLosingFocus(page, search, "leo");
  await page.waitForTimeout(600);
  await expect(search).toBeFocused();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("post composer retains focus across controlled rerenders", async ({
  page,
}) => {
  await signInDemo(page);
  const composer = page.locator("textarea[aria-label]").first();
  await expect(composer).toBeVisible();
  await typeWithoutLosingFocus(page, composer, "A stable post draft");
});

test("comments, reactions, profile editor, and message composer keep focus", async ({
  page,
}) => {
  await signInDemo(page);

  const commentsTrigger = page
    .getByRole("button", { name: "Show comments" })
    .first();
  await commentsTrigger.click();
  const comment = page.getByRole("textbox", { name: "Add a comment" }).first();
  await typeWithoutLosingFocus(page, comment, "Stable comment draft");

  const reaction = page.getByRole("button", { name: "React" }).first();
  await reaction.focus();
  await page.keyboard.press("ArrowDown");
  const toolbar = page.getByRole("toolbar", { name: "Choose reaction" });
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByRole("button").first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(toolbar.getByRole("button").nth(1)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toolbar).toBeHidden();
  await expect(reaction).toBeFocused();

  await page.goto("/settings/profile");
  const displayName = page.getByLabel("Display name");
  const originalName = await displayName.inputValue();
  await displayName.fill("");
  await typeWithoutLosingFocus(page, displayName, "Stable profile draft");
  await displayName.fill(originalName);

  await page.goto("/messages");
  await page.getByRole("button", { name: "New message" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New message" });
  await dialog.getByPlaceholder("Search people").fill("leo");
  const person = dialog.getByRole("button").filter({ hasText: "@leo" }).first();
  await person.click();
  await page.waitForURL(/\/messages\/[^/]+$/);
  const message = page.getByRole("textbox", { name: "Message", exact: true });
  await typeWithoutLosingFocus(page, message, "Stable message draft");
});

test("mobile More sheet traps focus and restores its trigger", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"));
  await signInDemo(page);
  const trigger = page.getByRole("button", { name: "More" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "More" });
  await expect(dialog).toBeVisible();

  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press(index % 3 === 0 ? "Shift+Tab" : "Tab");
    const focusInside = await dialog.evaluate((element) =>
      element.contains(document.activeElement),
    );
    expect(focusInside).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});
