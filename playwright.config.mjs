import { defineConfig } from '@playwright/test';
const port=process.env.HANZI_TEST_PORT||'18941';
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL, browserName: 'chromium', channel: process.env.CI ? undefined : 'chrome', serviceWorkers: 'block' },
  webServer: { command: 'npm run dev', url:baseURL, env: { PORT:port,HANZI_SUPABASE_URL:'',HANZI_SUPABASE_PUBLISHABLE_KEY:'',NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',SUPABASE_URL:'',SUPABASE_PUBLISHABLE_KEY:'',NEXT_PUBLIC_SUPABASE_ANON_KEY:'' }, reuseExistingServer: false },
  reporter: 'list'
});
