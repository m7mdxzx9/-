#!/usr/bin/env node
/**
 * تجهيز مجلد dist/ للنشر على GitHub Pages (أو أي استضافة ثابتة).
 *
 *   1) يحوّل كل ملف X.html إلى X/index.html  ← يشتغل مع /X على أي استضافة
 *      من غير ما يعتمد على محاولة الاستضافة إضافة .html تلقائياً.
 *   2) يكتب 404.html كقشرة فارغة تُحمّل نفس حزمة JS، فيأخذك expo-router
 *      للمسار الصحيح بدل صفحة خطأ ميتة.
 *   3) يتحقق أن كل مسار مذكور داخل index.html موجود فعلاً في dist/.
 *
 * الاستخدام: node scripts/pages-prepare.js [dist]
 */
const fs = require('fs');
const path = require('path');

const DIST = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  fail(`لا يوجد index.html في ${DIST} — شغّل npm run build:web أولاً.`);
}

const baseUrl = (() => {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const m = html.match(/(?:src|href)="([^"]*?)\/_expo\/static\/js/);
  return m ? m[1] : '';
})();

/** 1) X.html → X/index.html */
let moved = 0;
for (const entry of fs.readdirSync(DIST)) {
  if (!entry.endsWith('.html') || entry === 'index.html' || entry === '404.html') continue;
  const name = entry.replace(/\.html$/, '');
  if (name.startsWith('+')) {
    fs.rmSync(path.join(DIST, entry));
    continue;
  }
  const dir = path.join(DIST, decodeURIComponent(name));
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(path.join(DIST, entry), path.join(dir, 'index.html'));
  moved += 1;
}

/** 2) 404.html كقشرة تحمّل نفس الحزمة */
const findFile = (globDir, pattern) => {
  const walk = (dir) => {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, f.name);
      if (f.isDirectory()) {
        const hit = walk(full);
        if (hit) return hit;
      } else if (pattern.test(f.name)) {
        return full;
      }
    }
    return null;
  };
  return walk(globDir);
};

const entryJs = findFile(path.join(DIST, '_expo'), /entry-[a-f0-9]+\.js$/);
const globalCss = findFile(path.join(DIST, '_expo'), /\.css$/);
if (!entryJs) fail('لم أجد حزمة entry-*.js داخل dist/_expo');

const rel = (file) => (file ? '/' + path.relative(DIST, file).split(path.sep).join('/') : '');
const prefixed = (file) => (baseUrl || '') + rel(file);
const cssRef = JSON.stringify(prefixed(globalCss));
const jsRef = JSON.stringify(prefixed(entryJs));

fs.writeFileSync(
  path.join(DIST, '404.html'),
  `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no" />
    <title>مسار الطالب — جامعة أم القرى</title>
    <link rel="stylesheet" href=${cssRef} />
    <link rel="icon" href=${JSON.stringify((baseUrl || '') + '/favicon.ico')} />
  </head>
  <body>
    <div id="root"></div>
    <script src=${jsRef} defer></script>
  </body>
</html>
`,
);

/** 3) تحقق: كل مرجع في index.html موجود على القرص */
const indexHtml = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const refs = [...indexHtml.matchAll(/(?:src|href)="(\/[^"]+)"/g)].map((m) => m[1]);
const missing = [];
for (const ref of refs) {
  if (/^https?:/.test(ref) || ref === '/' || ref === '') continue;
  const relPath = ref.startsWith(baseUrl) ? ref.slice(baseUrl.length) : ref;
  const clean = relPath.split('?')[0].replace(/^\/+/, '');
  if (!clean) continue;
  const file = path.join(DIST, decodeURIComponent(clean));
  if (!fs.existsSync(file)) missing.push(`${ref} → ${path.relative(DIST, file)}`);
}

console.log(`✅ جهّزت ${DIST}`);
console.log(`   • مسارات نظيفة: ${moved} صفحة (X.html → X/index.html)`);
console.log(`   • مسار الأساس: ${baseUrl || '(جذر النطاق)'}`);
console.log(`   • 404.html: قشرة بديلة تحمّل ${path.basename(entryJs)}`);
if (missing.length) {
  console.log(`   ⚠️ مراجع غير موجودة (${missing.length}):`);
  for (const m of missing.slice(0, 8)) console.log(`      - ${m}`);
  if (baseUrl === '') {
    console.log('      نصيحة: على GitHub Projects شغّل البناء بـ EXPO_BASE_URL=/اسم-المستودع');
  }
} else {
  console.log('   ✓ كل الأصول المذكورة في index.html موجودة');
}
