import fs from "node:fs/promises";
import path from "node:path";

/** Approval keeps the prepared browser output and removes private source material. */
export async function retainRuntimeOnly(version: {
  filesDir: string;
  projectDir: string | null;
  sourceZipPath: string;
  entry: string;
}) {
  const runtimeRoot = path.resolve(version.filesDir);
  const sources = [version.projectDir, version.sourceZipPath].filter((p): p is string => !!p);
  for (const source of sources) {
    const root = path.resolve(source);
    if (root === runtimeRoot || runtimeRoot.startsWith(root + path.sep) || root.startsWith(runtimeRoot + path.sep)) {
      throw new Error("source_overlaps_runtime");
    }
  }
  const entry = path.resolve(runtimeRoot, version.entry);
  if (!version.entry || !entry.startsWith(runtimeRoot + path.sep) || !(await fs.stat(entry)).isFile()) {
    throw new Error("runtime_not_ready");
  }
  const files: {path: string; size: number}[] = [];
  async function walk(relative: string) {
    for (const item of await fs.readdir(path.join(runtimeRoot, relative), {withFileTypes: true})) {
      const name = path.join(relative, item.name);
      if (item.isDirectory()) await walk(name);
      else if (item.isFile()) files.push({path: name.split(path.sep).join("/"), size: (await fs.stat(path.join(runtimeRoot, name))).size});
      else throw new Error("unsafe_runtime_file");
    }
  }
  await walk("");
  files.sort((a, b) => a.path.localeCompare(b.path));
  if (version.projectDir) await fs.rm(version.projectDir, {recursive: true, force: true});
  await fs.rm(version.sourceZipPath, {force: true});
  return files;
}
