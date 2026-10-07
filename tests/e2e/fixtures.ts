import {test as base,expect} from '@playwright/test';
export const test=base.extend({page:async({page},use)=>{
 if(process.env.PLAYMINT_CI==='1')await page.route(/^https?:\/\/(?!127\.0\.0\.1(?=[:/])|localhost(?=[:/]))/,route=>route.abort());
 await use(page);
}});
export {expect};
