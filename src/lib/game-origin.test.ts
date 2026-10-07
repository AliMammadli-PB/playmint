import {expect,test} from 'vitest';
import {validateGameOrigin} from './game-origin';
test('same-origin runtime cannot acquire account access via permissive sandbox',()=>{for(const value of ['https://playmint.tr','https://playmint.tr:444','http://games.playmint.tr','https://user:pass@games.playmint.tr','https://games.playmint.tr/play','https://games.playmint.tr/?x=1'])expect(()=>validateGameOrigin(value,'https://playmint.tr')).toThrow();});
test('empty config remains opaque; a separate HTTPS hostname is normalized',()=>{expect(validateGameOrigin('','https://playmint.tr')).toBe('');expect(validateGameOrigin('https://games.playmint.tr/','https://playmint.tr')).toBe('https://games.playmint.tr');});
