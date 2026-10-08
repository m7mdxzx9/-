/**
 * إعداد ديناميكي فوق app.json:
 *
 *   EXPO_BASE_URL=/اسم-المستودع  npm run build:web   // مشروع على GitHub Pages
 *   EXPO_BASE_URL=               npm run build:web   // نشر على جذر النطاق (username.github.io)
 *
 * بدون متغيّر بيئة: لو كان التشغيل داخل GitHub Actions نستنتج المسار من اسم المستودع،
 * وإلا نترك الجذر (تطوير محلي). القيمة تُمرَّر أيضاً إلى extra.baseUrl لتقرأها الواجهة
 * عند حقن رابط الـ manifest وأيقونات PWA وقت التشغيل.
 */
function resolveBase() {
  const raw = process.env.EXPO_BASE_URL;
  if (raw !== undefined) {
    const base = raw.trim().replace(/\/+$/, '');
    return base && base !== '/' ? (base.startsWith('/') ? base : `/${base}`) : '';
  }
  if (process.env.GITHUB_REPOSITORY) {
    const name = process.env.GITHUB_REPOSITORY.split('/')[1] || '';
    return name ? `/${name}` : '';
  }
  return '';
}

module.exports = ({ config }) => {
  const base = resolveBase();
  if (base) {
    config.experiments = { ...config.experiments, baseUrl: base };
  } else if (config.experiments) {
    const experiments = { ...config.experiments };
    delete experiments.baseUrl;
    config.experiments = experiments;
  }
  config.extra = { ...config.extra, baseUrl: base };
  if (process.env.CI === 'true') {
    config.extra = { ...config.extra, buildTime: new Date().toISOString() };
  }
  return config;
};
