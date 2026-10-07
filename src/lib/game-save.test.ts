import {describe,it,expect} from 'vitest';
import {parseGameSave,readGameSave} from './game-save';
describe('isolated device game saves',()=>{
 it('accepts a bounded string snapshot without inheriting object keys',()=>{const save=parseGameSave({level:'3','miso-garden':'{"coins":12}'});expect(save?.level).toBe('3');expect(Object.getPrototypeOf(save)).toBe(null);});
 it('rejects prototype keys, nested payloads and excessive bytes',()=>{expect(parseGameSave(JSON.parse('{"__proto__":"x"}'))).toBeNull();expect(parseGameSave({level:{admin:true}})).toBeNull();expect(parseGameSave({a:'x'.repeat(32769)})).toBeNull();expect(parseGameSave(Object.fromEntries(Array.from({length:101},(_,i)=>['key'+i,'1'])))).toBeNull();expect(parseGameSave({a:'🐈'.repeat(16000),b:'🐈'.repeat(16000)})).toBeNull();});
 it('reads only the mounted game namespace and survives disabled storage',()=>{let read='';expect(readGameSave({getItem:key=>{read=key;return '{"level":"4"}';}},'game-a').level).toBe('4');expect(read).toBe('pm:game-save:game-a');expect(readGameSave({getItem:()=>{throw Error('disabled')}},'game-a')).toEqual({});});
});
