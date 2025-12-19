#!/usr/bin/env node

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5173;
const ROOT = path.join(__dirname, "..", "src");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
};

function serveFile(filePath, res) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 - لم يتم العثور على الملف");
      return;
    }

    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const safePath = path.normalize(decodeURI(req.url.split("?")[0])).replace(/^(\.\.(\/|\\|$))+/, "");
  let filePath = path.join(ROOT, safePath);

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.access(filePath, fs.constants.F_OK, (accessErr) => {
      if (accessErr) {
        serveFile(path.join(ROOT, "index.html"), res);
      } else {
        serveFile(filePath, res);
      }
    });
  });
});

server.listen(PORT, () => {
  console.log(`🚀 خادم التطوير يعمل على: http://localhost:${PORT}`);
});
