/**
 * صفحة الخريطة (Leaflet + OpenStreetMap) بدون أي API key.
 * تُستخدم داخل iframe على الويب وداخل react-native-webview على الجوال.
 * البلاط يحتاج إنترنت على جهاز المستخدم فقط؛ الخطوط تُرسم كطبقة متجهات فوقه.
 */
export const MAP_HTML = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html,body,#map{height:100%;margin:0;background:#e8eef3}
  body.dark #map{background:#0f1720}
  .lbl{font:600 11px/1.4 system-ui,sans-serif;color:#0b1220;background:rgba(255,255,255,.85);padding:2px 6px;border-radius:6px}
  body.dark .lbl{color:#e8edf2;background:rgba(15,23,32,.8)}
  #badge{position:absolute;top:8px;inset-inline-start:8px;z-index:900}
  .pulse{width:14px;height:14px;border-radius:50%;background:#0f766e;box-shadow:0 0 0 0 rgba(15,118,110,.6);animation:p 1.6s infinite}
  @keyframes p{70%{box-shadow:0 0 0 14px rgba(15,118,110,0)}100%{box-shadow:0 0 0 0 rgba(15,118,110,0)}}
</style>
</head>
<body>
<div id="map"></div>
<div id="badge"><div class="pulse"></div></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var lines = {};
  var group = null;
  var started = false;
  var map;

  function post(obj) {
    var data = JSON.stringify(obj);
    try {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(data);
      else if (window.parent && window.parent !== window) window.parent.postMessage(data, '*');
    } catch (e) {}
  }

  function ensureMap() {
    if (map) return map;
    try {
      map = L.map('map', { zoomControl: true, attributionControl: true, preferCanvas: true }).setView([21.3825, 39.8359], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).on('tileerror', function () { post({ type: 'error', message: 'تعذّر تحميل بلاط الخريطة (لا يوجد إنترنت؟) — الخطوط تبقى ظاهرة.' }); })
        .addTo(map);
      group = L.layerGroup().addTo(map);
    } catch (e) {
      post({ type: 'error', message: 'Leaflet لم يُحمَّل: ' + e });
    }
    return map;
  }

  function draw(id, line) {
    var m = ensureMap();
    if (!m || !line || !line.points || line.points.length === 0) return;
    if (lines[id]) { group.removeLayer(lines[id]); delete lines[id]; }
    var latlngs = line.points.map(function (p) { return [p[0], p[1]]; });
    var pl = L.polyline(latlngs, {
      color: line.color || '#0f766e',
      weight: line.dashed ? 3 : 4,
      opacity: 0.95,
      dashArray: line.dashed ? '6 6' : null,
      lineJoin: 'round'
    }).addTo(group);
    if (latlngs.length === 1) L.circleMarker(latlngs[0], { radius: 5, color: line.color || '#0f766e' }).addTo(group);
    else {
      L.marker(latlngs[0], { icon: L.divIcon({ className: 'lbl', html: 'بداية', iconSize: [46, 20] }) }).addTo(group);
      L.marker(latlngs[latlngs.length - 1], { icon: L.divIcon({ className: 'lbl', html: 'نهاية', iconSize: [46, 20] }) }).addTo(group);
    }
    lines[id] = pl;
  }

  window.__cmd = function (cmd) {
    if (!cmd) return;
    var m = ensureMap();
    if (!m) return;
    try {
      if (cmd.type === 'render') {
        if (!started) { started = true; post({ type: 'ready' }); }
        var seen = {};
        (cmd.lines || []).forEach(function (l) { seen[l.id] = 1; draw(l.id, l); });
        Object.keys(lines).forEach(function (id) {
          if (!seen[id]) { m.removeLayer(lines[id]); delete lines[id]; }
        });
        if (cmd.fit) {
          var all = [];
          Object.keys(lines).forEach(function (id) { all = all.concat(lines[id].getLatLngs()); });
          if (all.length > 1) m.fitBounds(L.latLngBounds(all).pad(0.18));
          else if (all.length === 1) m.setView(all[0], 16);
        }
        setTimeout(function () { m.invalidateSize(); }, 60);
      } else if (cmd.type === 'append') {
        var line = lines[cmd.id];
        if (!line) { draw(cmd.id, { id: cmd.id, color: cmd.color, points: [[cmd.lat, cmd.lng]] }); line = lines[cmd.id]; }
        else line.addLatLng([cmd.lat, cmd.lng]);
        if (map._trackFit) map.panTo([cmd.lat, cmd.lng], { animate: true });
      } else if (cmd.type === 'center') {
        m.setView([cmd.lat, cmd.lng], cmd.zoom || 16);
      } else if (cmd.type === 'theme') {
        document.body.className = cmd.dark ? 'dark' : '';
      }
    } catch (e) {
      post({ type: 'error', message: 'خريطة: ' + e });
    }
  };

  function hook() {
    var m = ensureMap();
    if (!m) { setTimeout(hook, 200); return; }
    m.on('click', function (e) { post({ type: 'click', lat: e.latlng.lat, lng: e.latlng.lng }); });
    post({ type: 'ready' });
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') hook();
  else document.addEventListener('DOMContentLoaded', hook);
})();
</script>
</body>
</html>`;
