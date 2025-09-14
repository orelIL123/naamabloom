// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// הוסף 'cjs' אם לא קיים (בלי לדרוס את הרשימה)
if (!config.resolver.sourceExts.includes('cjs')) {
  config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
}

// אל תדרוס assetExts; הדיפולט כבר כולל png/jpg/jpeg וכו'
// אם ממש חייבים, עשה כך:
// config.resolver.assetExts = Array.from(
//   new Set([...config.resolver.assetExts, 'png', 'jpg', 'jpeg'])
// );

// אל תדרוס את הפלטפורמות; רק ודא שהן כוללות native
const defaultPlatforms = config.resolver.platforms || [];
config.resolver.platforms = Array.from(
  new Set([...defaultPlatforms, 'ios', 'android', 'native', 'web'])
);

// הפעלת סמלינקים במטרו החדש (לא symlinks=true) - מושבת לעת עתה
// config.resolver.unstable_enableSymlinks = true;

// (אופציונלי) שיפור יציבות / ביצועים ב-CI
// config.resolver.unstable_disableWatches = true;

// ⚠️ חשוב: אל תשים כאן Node polyfills לנייטיב
// אם אתה צריך polyfills ל-web, עשה זאת ב-webpack (app.plugin.js / next/webpack וכו'),
// או הסר את התלות הדורשת crypto/http וכו' בנייד.

// נקה כל alias של node:*
delete config.resolver.alias;

module.exports = config;
