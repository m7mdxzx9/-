/**
 * إعداد ديناميكي: يسمح بتغيير مسار أساس الموقع بدون تعديل app.json.
 *
 *   EXPO_BASE_URL=/اسم-المستودع  npm run build:web   // مشروع على GitHub Pages
 *   EXPO_BASE_URL=               npm run build:web   // نشر على جذر النطاق (username.github.io)
 *
 * القيمة الافتراضية في app.json تناسب هذا المستودع (اسمه `-` أي أن المسار هو /-).
 */
module.exports = ({ config }) => {
  const raw = process.env.EXPO_BASE_URL;
  if (raw !== undefined) {
    const base = raw.trim().replace(/\/+$/, '');
    if (base && base !== '/') {
      config.experiments = { ...config.experiments, baseUrl: base.startsWith('/') ? base : `/${base}` };
    } else {
      const experiments = { ...config.experiments };
      delete experiments.baseUrl;
      config.experiments = experiments;
    }
  }
  if (process.env.CI === 'true') {
    config.extra = { ...config.extra, buildTime: new Date().toISOString() };
  }
  return config;
};
