#!/usr/bin/env bash
# ينشر نسخة dist/ على مستودع GitHub Pages آخر (اختياري — للحصول على رابط نظيف).
#
#   REPO=m7mdxzx9/m7mdxzx9.github.io ./scripts/publish-site.sh
#   REPO=me/site BRANCH=gh-pages ./scripts/publish-site.sh /ai-uqu
#
# الوسيط = مسار الأساس: اتركه فارغاً للنشر على جذر النطاق (username.github.io)،
# أو مرّر /اسم-المجلد لو ستنشر داخل مجلد من مستودع الموقع الشخصي.
# لا يلمس هذا المستودع ولا فرعه — يقرأ dist/ فقط.
set -euo pipefail

TARGET_REPO="${REPO:?استخدم REPO=المالك/اسم-المستودع}"
TARGET_BRANCH="${BRANCH:-main}"
BASE_URL="${1:-}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "1/3 البناء بمسار أساس: ${BASE_URL:-<جذر النطاق>}"
( cd "$ROOT" && EXPO_BASE_URL="$BASE_URL" npm run build:web >/dev/null && node scripts/pages-prepare.js dist )

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "2/3 جلب $TARGET_REPO ($TARGET_BRANCH)"
if git ls-remote --exit-code "https://github.com/$TARGET_REPO.git" "$TARGET_BRANCH" >/dev/null 2>&1; then
  git clone --depth 1 --branch "$TARGET_BRANCH" "https://github.com/$TARGET_REPO.git" "$WORK/site"
  mkdir -p "$WORK/site/$BASE_URL"
  find "$WORK/site/$BASE_URL" -mindepth 1 -maxdepth 1 -not -name '.git' -delete 2>/dev/null || true
else
  git init -q --initial-branch="$TARGET_BRANCH" "$WORK/site"
fi

echo "3/3 نسخ dist/ والدفع"
DEST="$WORK/site${BASE_URL:+/$BASE_URL}"
mkdir -p "$DEST"
cp -R "$ROOT/dist/." "$DEST/"
cd "$WORK/site"
git add -A
if git diff --cached --quiet; then
  echo "لا تغييرات — الموقع محدّث أصلاً."
  exit 0
fi
git -c user.name="publish-site" -c user.email="publish-site@localhost" \
  commit -q -m "نشر نسخة $(date -u +%Y-%m-%dT%H:%MZ)"
echo
echo "الجاهز للنشر:"
git show --stat --oneline HEAD | head -12
echo
read -r -p "أدفع إلى $TARGET_REPO@$TARGET_BRANCH؟ [y/N] " ans
if [[ "${ans,,}" == "y" ]]; then
  git push -q "https://github.com/$TARGET_REPO.git" "HEAD:$TARGET_BRANCH"
  echo "✓ تم. فعّل Pages في مستودع الهدف: Settings → Pages → Source: Deploy from a branch → $TARGET_BRANCH /(root)"
else
  echo "أُلغي الدفع. الملفات ما زالت في $WORK/site لمراجعتها."
  trap - EXIT
fi
