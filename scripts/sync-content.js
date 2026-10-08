#!/usr/bin/env node
/**
 * مزامنة محتوى المستودع مع سيرفر اللوحة.
 *
 *   node scripts/sync-content.js --push              // content/ → السيرفر
 *   node scripts/sync-content.js --pull              // السيرفر → content/
 *   node scripts/sync-content.js --push --key courses
 *
 * الخيارات: --url <link>  --token <ADMIN_TOKEN>
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const KEYS = ['program', 'courses', 'tracks', 'projects', 'resources'];

const argv = process.argv.slice(2);
const getFlag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : fallback;
};

const URL_BASE = getFlag('url', process.env.API_BASE || 'http://localhost:8787').replace(/\/+$/, '');
const TOKEN = getFlag('token', process.env.ADMIN_TOKEN || 'dev-token');
const ONLY = getFlag('key', null);
const keys = ONLY ? [ONLY] : KEYS;
const push = argv.includes('--push');
const pull = argv.includes('--pull');

if (!push && !pull) {
  console.log('استخدم --push أو --pull. مثال: node scripts/sync-content.js --push');
  process.exit(1);
}

async function main() {
  for (const key of keys) {
    const file = path.join(CONTENT_DIR, `${key}.json`);
    if (pull) {
      const res = await fetch(`${URL_BASE}/api/content/${key}`);
      if (!res.ok) throw new Error(`${key}: HTTP ${res.status}`);
      const { data } = await res.json();
      fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
      console.log(`⬇️  ${key} ← السيرفر (تمّت الكتابة في content/${key}.json)`);
    } else {
      if (!fs.existsSync(file)) throw new Error(`ملف مفقود: content/${key}.json`);
      const body = fs.readFileSync(file, 'utf8');
      JSON.parse(body); // فشل مبكر لو JSON مكسور
      const res = await fetch(`${URL_BASE}/api/content/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
        body,
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(`${key}: ${out.error || 'HTTP ' + res.status}`);
      console.log(`⬆️  ${key} → السيرفر (${out.bytes} بايت) • ${out.contentVersion}`);
    }
  }
  console.log('\nتمّت المزامنة. افتح التطبيق واضغط «مزامنة المحتوى» في الإعدادات ليصل التحديث.');
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  console.error(`   تأكد أن السيرفر يعمل: npm run server  (${URL_BASE})`);
  process.exit(1);
});
