import {describe,it,expect} from "vitest";
import {createHmac} from "node:crypto";
import {splitAdRevenue} from "./monetization";
import {verifyAdSignature} from "./ad-verification";
describe("rewarded-ad accounting",()=>{
 it("splits 100 dollars equally and conserves every cent",()=>{
  expect(splitAdRevenue(10000)).toEqual({developerCents:5000,platformCents:5000});
  for(const amount of [0,1,3,999,10001]){const s=splitAdRevenue(amount);expect(s.developerCents+s.platformCents).toBe(amount);expect(Math.abs(s.developerCents-s.platformCents)).toBeLessThanOrEqual(1);}
 });
 it("rejects fractional, negative and unsafe amounts",()=>{for(const n of [-1,0.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])expect(()=>splitAdRevenue(n)).toThrow();});
 it("rejects spoofed, changed and stale provider callbacks",()=>{
  const secret="test-only-key",timestamp="1791300000",raw='{"completed":true}';const sig=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");const now=Number(timestamp)*1000;
  expect(verifyAdSignature(raw,timestamp,sig,secret,now)).toBe(true);
  expect(verifyAdSignature(raw+" ",timestamp,sig,secret,now)).toBe(false);
  expect(verifyAdSignature(raw,timestamp,sig,secret,now+300001)).toBe(false);
  expect(verifyAdSignature(raw,timestamp,"fake",secret,now)).toBe(false);
  expect(verifyAdSignature(raw,timestamp,sig,"another-key",now)).toBe(false);
 });
});
