import { expect, test } from "@playwright/test";

test("home page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Face-match event photos in a local-first stack.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Event" })).toBeVisible();
});

