#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "..", "src");
const DIST = path.join(__dirname, "..", "dist");

function removeDist() {
  fs.rmSync(DIST, { recursive: true, force: true });
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function build() {
  removeDist();
  copyDir(SRC, DIST);
  console.log("📦 تم إنشاء نسخة الإنتاج في مجلد dist");
}

build();
