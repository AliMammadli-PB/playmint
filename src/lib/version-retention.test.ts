import {afterEach, expect, test} from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {retainRuntimeOnly} from "./version-retention";

const temporary: string[] = [];
afterEach(async () => {for (const root of temporary.splice(0)) await fs.rm(root, {recursive: true, force: true});});
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "playmint-retention-")); temporary.push(root);
  const v = {filesDir: path.join(root, "runtime"), projectDir: path.join(root, "project"), sourceZipPath: path.join(root, "source.zip"), entry: "index.html"};
  await fs.mkdir(path.join(v.filesDir, "assets"), {recursive: true});
  await fs.mkdir(v.projectDir);
  await fs.writeFile(path.join(v.filesDir, "index.html"), "game");
  await fs.writeFile(path.join(v.filesDir, "assets", "game.js"), "play");
  await fs.writeFile(path.join(v.projectDir, "secret.ts"), "private source");
  await fs.writeFile(v.sourceZipPath, "original ZIP");
  return v;
}
test("approval removes source material, preserves runtime assets and can safely retry", async () => {
  const v = await fixture();
  expect(await retainRuntimeOnly(v)).toEqual([{path: "assets/game.js", size: 4}, {path: "index.html", size: 4}]);
  await expect(fs.stat(v.projectDir)).rejects.toThrow();
  await expect(fs.stat(v.sourceZipPath)).rejects.toThrow();
  expect(await fs.readFile(path.join(v.filesDir, "assets/game.js"), "utf8")).toBe("play");
  expect((await retainRuntimeOnly(v)).length).toBe(2);
});
test("missing runtime entry keeps sources intact", async () => {
  const v = await fixture();
  await expect(retainRuntimeOnly({...v, entry: "missing.html"})).rejects.toThrow();
  expect((await fs.stat(v.sourceZipPath)).isFile()).toBe(true);
  expect((await fs.stat(v.projectDir)).isDirectory()).toBe(true);
});
test("overlapping source and runtime directories are never removed", async () => {
  const v = await fixture();
  await expect(retainRuntimeOnly({...v, projectDir: path.dirname(v.filesDir)})).rejects.toThrow("source_overlaps_runtime");
  expect((await fs.stat(path.join(v.filesDir, v.entry))).isFile()).toBe(true);
});
