import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
const require=createRequire(import.meta.url);
const source=path.dirname(require.resolve('@ruffle-rs/ruffle'));
const destination=path.resolve('public/legacy/ruffle');
await fs.mkdir(destination,{recursive:true});
for(const name of await fs.readdir(source)){
 if(/\.(js|wasm)(\.map)?$/.test(name)||/^LICENSE/.test(name)||name==='README.md'||name==='package.json')await fs.copyFile(path.join(source,name),path.join(destination,name));
}
console.log('Pinned Ruffle runtime prepared.');
