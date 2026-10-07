import { expect, test } from "./fixtures";
import { createSwfWrapper } from "../../src/lib/legacy-flash";

test("legacy flash wrapper loads Ruffle and does not trap a phone page", async ({ page }) => {
  const html = createSwfWrapper({ swfFile: "game.swf", title: "Age of War 2", ruffleBaseUrl: "https://playmint.tr/legacy/ruffle/" });
  await page.route("https://playmint.tr/legacy/ruffle/**", (route) => {
    if (route.request().url().endsWith("/ruffle.js")) {
      return route.fulfill({
        contentType: "text/javascript",
        body: "window.RufflePlayer=window.RufflePlayer||{};window.RufflePlayer.newest=function(){return {createPlayer(){const el=document.createElement('div');el.id='ruffle-player';el.style.width='100%';el.style.height='100%';el.load=async function(){document.body.dataset.runtime='ok';};return el;}};};",
      });
    }
    return route.fulfill({ status: 200, body: "" });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.setContent(html, { waitUntil: "load" });
  await expect(page.locator("#ruffle-player")).toBeVisible();
  await expect(page.locator("body")).toHaveAttribute("data-runtime", "ok");
  const stage = await page.locator("#stage").boundingBox();
  expect(stage?.width).toBeGreaterThan(1400);
  expect(stage?.height).toBeGreaterThan(800);
  await page.setViewportSize({ width: 375, height: 812 });
  const hint = page.getByText("Bu oyun klavye/fare için tasarlanmıştır.");
  await expect(hint).toBeVisible();
  const hintBox = await hint.boundingBox();
  expect(hintBox!.height).toBeLessThan(120);
  await expect(page.locator("#stage")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(hint).toBeHidden();
});

test("legacy import review is not a public page", async ({ page }) => {
  await page.goto("/tr/studio-bcb7017af2212dfd4eb0e12ee757edc05d2234d4/legacy");
  await expect(page).toHaveURL(/\/tr\/login/);
});
