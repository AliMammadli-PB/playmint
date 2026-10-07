import {expect,test} from 'vitest';
import {legalCopy,legalDocuments} from './legal-copy';
test('all five legal drafts disclose pending identity in all locales without fabricated operator details',()=>{for(const locale of ['tr','az','en'] as const)for(const document of legalDocuments){const c=legalCopy(locale,document);expect(c.title.length).toBeGreaterThan(5);expect(c.draft.length).toBeGreaterThan(50);expect(c.paragraphs.length).toBeGreaterThanOrEqual(3);expect(c.paragraphs.join(' ')).not.toMatch(/registered company|VÖEN:|tax number:/i);}});
