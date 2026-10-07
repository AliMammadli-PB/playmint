import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractGameZip } from "./zip";
import { mimeFor } from "./mime";
import {
  assertAllowedSwfUrl,
  createSwfWrapper,
  dedupeSwfBlobs,
  downloadSwf,
  guessCategory,
  legacyCoverSvg,
  legacyRightsBlockPublish,
  storeZip,
  titleFromSwfFilename,
} from "./legacy-flash";

describe("legacy flash names", () => {
  it("cleans ids and keeps sequel numbers", () => {
    expect(titleFromSwfFilename("age-of-war-2-5933.swf")).toBe("Age of War 2");
    expect(titleFromSwfFilename("age-of-war-2.swf")).toBe("Age of War 2");
    expect(titleFromSwfFilename("boxhead_2play.swf")).toBe("Boxhead 2Play");
    expect(titleFromSwfFilename("bubble-tanks-2.swf")).toBe("Bubble Tanks 2");
    expect(titleFromSwfFilename("electricman2.swf")).toBe("Electricman 2");
    expect(titleFromSwfFilename("learn-to-fly.swf")).toBe("Learn to Fly");
  });

  it("maps known titles onto existing categories", () => {
    expect(guessCategory("Age of War")).toBe("strategy");
    expect(guessCategory("Age of War 2")).toBe("strategy");
    expect(guessCategory("Boxhead 2Play")).toBe("action");
    expect(guessCategory("Bubble Tanks 2")).toBe("action");
    expect(guessCategory("Electricman 2")).toBe("action");
    expect(guessCategory("Learn to Fly")).toBe("arcade");
    expect(guessCategory("Plazma Burst 2")).toBe("shooter");
    expect(guessCategory("Blocks")).toBe("arcade");
  });
});

describe("legacy flash duplicates and downloads", () => {
  it("keeps one game when two filenames share a blob", () => {
    const result = dedupeSwfBlobs([
      { path: "age-of-war-2-5933.swf", sha: "fbf6641c81578cc040fbe821d71cb614dd40d6a4", size: 10 },
      { path: "age-of-war-2.swf", sha: "fbf6641c81578cc040fbe821d71cb614dd40d6a4", size: 10 },
      { path: "learn-to-fly.swf", sha: "3e496c69a7da24ba00f339b8e4caf1e6b3324602", size: 4 },
    ]);
    expect(result.duplicatesSkipped).toBe(1);
    expect(result.unique).toHaveLength(2);
    const age = result.unique.find((item) => item.sha.startsWith("fbf664"));
    expect(age?.sourceFile).toBe("age-of-war-2.swf");
    expect(titleFromSwfFilename(age!.sourceFile)).toBe("Age of War 2");
  });

  it("rejects urls outside the source repository", () => {
    expect(() => assertAllowedSwfUrl("https://evil.example/game.swf")).toThrow("bad_url");
    expect(() => assertAllowedSwfUrl("http://api.github.com/repos/krestenlaust/swfgames/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toThrow("bad_url");
    expect(() => assertAllowedSwfUrl("https://user:pass@api.github.com/repos/krestenlaust/swfgames/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toThrow("bad_url");
    expect(() => assertAllowedSwfUrl("https://api.github.com/repos/other/swfgames/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")).toThrow("bad_url");
    expect(() => assertAllowedSwfUrl("file:///tmp/game.swf")).toThrow("bad_url");
  });

  it("rejects an invalid swf body and a redirect off GitHub", async () => {
    const fetchImpl: typeof fetch = async () => new Response(Buffer.from("not-a-swf"), { status: 200 });
    await expect(downloadSwf("https://api.github.com/repos/krestenlaust/swfgames/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { fetchImpl })).rejects.toThrow("invalid_swf");
    const redirect: typeof fetch = async () => new Response(null, { status: 302, headers: { location: "http://169.254.169.254/latest" } });
    await expect(downloadSwf("https://api.github.com/repos/krestenlaust/swfgames/git/blobs/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { fetchImpl: redirect })).rejects.toThrow("bad_url");
  });
});

describe("legacy flash package", () => {
  it("serves swf with the flash mime type", () => {
    expect(mimeFor("game.swf")).toBe("application/x-shockwave-flash");
  });

  it("builds a responsive wrapper and accepts it in the zip scanner", async () => {
    const html = createSwfWrapper({ swfFile: "game.swf", title: "Age of War 2", ruffleBaseUrl: "https://playmint.tr/legacy/ruffle/" });
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain("width=device-width");
    expect(html).toContain("https://playmint.tr/legacy/ruffle/ruffle.js");
    expect(html).toContain("./game.swf");
    expect(html).toContain("Bu oyun klavye/fare için tasarlanmıştır.");
    expect(html).toContain('id="fail"');
    expect(html).toContain('"allowScriptAccess":false');
    expect(html).toContain('"allowNetworking":"internal"');
    expect(html).toContain('"openUrlMode":"deny"');
    const swf = Buffer.from("FWS\x08rest-of-header");
    const zip = storeZip([
      { name: "index.html", data: Buffer.from(html) },
      { name: "game.swf", data: swf },
    ]);
    const dir = await mkdtemp(join(tmpdir(), "pm-swf-"));
    try {
      await writeFile(join(dir, "game.zip"), zip);
      const result = await extractGameZip(join(dir, "game.zip"), join(dir, "out"));
      expect(result.entry.toLowerCase()).toBe("index.html");
      expect(result.report.warnings).toContain("binary_requires_review:game.swf");
      expect(await readFile(join(dir, "out", "game.swf"))).toEqual(swf);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("requires rights verification or explicit operator authorization", () => {
    expect(legacyRightsBlockPublish({ legacyFlash: { rightsStatus: "pending" } })).toBe(true);
    expect(legacyRightsBlockPublish({ legacyFlash: { rightsStatus: "rejected" } })).toBe(true);
    expect(legacyRightsBlockPublish({ legacyFlash: { rightsStatus: "verified" } })).toBe(false);
    expect(legacyRightsBlockPublish({ legacyFlash: { rightsStatus: "operator_authorized" } })).toBe(false);
    expect(legacyRightsBlockPublish({})).toBe(false);
    expect(legacyCoverSvg("Age of War 2")).toContain("Age of War 2");
    expect(legacyCoverSvg("Bubble Tanks 2")).not.toBe(legacyCoverSvg("Age of War 2"));
  });
});
