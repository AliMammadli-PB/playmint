import {defineConfig} from '@playwright/test';
const isolated=process.env.PLAYMINT_CI==='1';
const baseURL=process.env.PLAYMINT_TEST_ORIGIN||(isolated?'http://127.0.0.1:3032':'https://playmint.tr');
if(isolated&&!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(baseURL))throw Error('CI requires a loopback test origin');
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:45000,
 forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,
 use:{storageState:process.env.PLAYMINT_TEST_STORAGE_STATE,baseURL,headless:true,trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:process.env.PLAYMINT_CHROMIUM_PATH?{executablePath:process.env.PLAYMINT_CHROMIUM_PATH,args:['--no-sandbox']}:undefined},
 webServer:isolated?{command:'pnpm start --hostname 127.0.0.1 --port '+new URL(baseURL).port,url:baseURL+'/api/health',reuseExistingServer:false,timeout:120000}:undefined,
 reporter:[['list'],['html',{outputFolder:'test-results/playwright-report',open:'never'}]],outputDir:'test-results/artifacts',
});
