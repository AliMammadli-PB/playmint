import {expect,test} from 'vitest';
import {parseSupport} from './game-capabilities';
test('new uploads need explicit choices, while legacy unspecified support stays unknown',()=>{expect(parseSupport('yes',true)).toBe(true);expect(parseSupport('no',true)).toBe(false);expect(parseSupport(null)).toBe(null);expect(parseSupport('')).toBe(null);expect(()=>parseSupport(null,true)).toThrow('capability_required');expect(()=>parseSupport('true',true)).toThrow('capability_required');});
