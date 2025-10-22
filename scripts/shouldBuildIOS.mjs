import { execSync } from "node:child_process";
import fs from "node:fs";

const NATIVE_DIRS = ["ios/", "android/", "plugins/"];
const NATIVE_FILES = [
  "AppDelegate.m", "AppDelegate.mm", "AppDelegate.swift",
  "MainApplication.java", "MainActivity.java", "MainActivity.kt",
  "app.json", "eas.json", "Info.plist"
];
const NATIVE_DEPS_HINTS = [
  "react-native", "expo", "@react-native", "expo-modules",
  "unimodules", "notifee", "lottie-react-native", "sentry",
  "revenuecat", "react-native-reanimated", "react-native-vision-camera",
  "react-native-maps", "react-native-push-notification", "react-native-permissions",
  "firebase", "@react-native-firebase"
];

function safe(cmd) {
  try { return execSync(cmd, { stdio: ["ignore","pipe","ignore"] }).toString().trim(); }
  catch { return ""; }
}

function changedFiles() {
  let diff = safe("git diff --name-only HEAD~1..HEAD");
  if (!diff) diff = safe("git diff --name-only origin/main...HEAD") || safe("git diff --name-only");
  return diff.split("\n").filter(Boolean);
}

function isNativePath(f) {
  if (NATIVE_DIRS.some(d => f.startsWith(d))) return true;
  if (NATIVE_FILES.some(n => f.endsWith("/"+n) || f === n)) return true;
  return false;
}

function pkgNativeChanged(files) {
  if (!files.includes("package.json")) return false;
  try {
    const cur = JSON.parse(fs.readFileSync("package.json","utf8"));
    const prevRaw = safe("git show HEAD~1:package.json");
    if (!prevRaw) return true;
    const prev = JSON.parse(prevRaw);
    const merged = { ...(cur.dependencies||{}), ...(cur.devDependencies||{}) };
    const prevMerged = { ...(prev.dependencies||{}), ...(prev.devDependencies||{}) };
    return Object.keys({ ...merged, ...prevMerged }).some(name => {
      if (!NATIVE_DEPS_HINTS.some(h => name.includes(h))) return false;
      return merged[name] !== prevMerged[name];
    });
  } catch { return true; }
}

function appJsonNativeChanged(files) {
  if (!files.includes("app.json")) return false;
  try {
    const curRaw = fs.readFileSync("app.json","utf8");
    const prevRaw = safe("git show HEAD~1:app.json");
    if (!prevRaw) return true;
    const cur = JSON.parse(curRaw).expo || {};
    const prev = JSON.parse(prevRaw).expo || {};
    const touchy = [
      "ios.bundleIdentifier","ios.infoPlist","ios.entitlements",
      "ios.config","ios.buildNumber","icon","name","plugins"
    ];
    const get = (obj, path) => path.split(".").reduce((a,k)=>a?.[k], obj);
    return touchy.some(p => JSON.stringify(get(cur,p)) !== JSON.stringify(get(prev,p)));
  } catch { return true; }
}

(function main(){
  const files = changedFiles();
  if (!files.length) {
    console.log("⚠️  No git history found; allowing build to avoid false negatives.");
    process.exit(0);
  }

  const triggers = [];
  if (files.some(isNativePath)) triggers.push("ios/android/plugins paths");
  if (pkgNativeChanged(files)) triggers.push("package.json native deps");
  if (appJsonNativeChanged(files)) triggers.push("app.json ios settings");

  if (triggers.length === 0) {
    console.log("🚫 No native changes detected → DO NOT build. Use EAS Update.");
    process.exit(1);
  } else {
    console.log("✅ Native change detected ⇒ build allowed. Triggers:", triggers.join(", "));
    process.exit(0);
  }
})();