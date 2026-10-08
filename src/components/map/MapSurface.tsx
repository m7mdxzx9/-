import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';
// أنواع react-native-webview 14 غير متوافقة مع أنواع React Native 0.86 في فحص الأنواع،
// بينما تعمل وقت التشغيل. نعزل عدم التوافق هنا بدل تلويث بقية الملفات بـ any.
import * as ReactNativeWebView from 'react-native-webview';

import { MAP_HTML } from '@/lib/mapHtml';

import type { MapCommand, MapEvent, MapSurfaceHandle } from './shared';

export interface MapSurfaceProps {
  dark: boolean;
  height?: number;
  onEvent?: (event: MapEvent) => void;
}

/** نسخة الجوال: نفس صفحة HTML داخل WebView، والمراسلة عبر postMessage/injectJavaScript */
type WebViewLike = { injectJavaScript: (script: string) => void } & React.ComponentRef<any>;

export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface(
  { dark, height = 300, onEvent },
  ref,
) {
  const WebViewComponent = (ReactNativeWebView as unknown as { WebView: React.ComponentType<any> }).WebView;
  const webRef = useRef<WebViewLike | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<MapCommand[]>([]);
  const [error, setError] = useState<string | null>(null);

  const deliver = useCallback((cmd: MapCommand) => {
    if (readyRef.current && webRef.current) {
      webRef.current.injectJavaScript(`window.__cmd && window.__cmd(${JSON.stringify(cmd)}); true;`);
    } else {
      queueRef.current.push(cmd);
    }
  }, []);

  useImperativeHandle(ref, () => ({ send: deliver }), [deliver]);

  const flush = useCallback(() => {
    const pending = queueRef.current;
    queueRef.current = [];
    pending.forEach(deliver);
  }, [deliver]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as MapEvent;
        if (data.type === 'ready') {
          readyRef.current = true;
          flush();
        }
        if (data.type === 'error') setError(data.message);
        onEvent?.(data);
      } catch {
        // تجاهل الرسائل غير المتوقعة
      }
    },
    [flush, onEvent],
  );

  useEffect(() => {
    deliver({ type: 'theme', dark });
  }, [dark, deliver]);

  return (
    <View style={{ height, overflow: 'hidden', borderRadius: 12, backgroundColor: dark ? '#0f1720' : '#e8eef3' }}>
      <WebViewComponent
        ref={webRef}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
        onError={() => setError('تعذّر تحميل الخريطة — استخدم العرض المبسّط.')}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      />
      {error ? (
        <Text
          style={{
            position: 'absolute',
            insetInlineStart: 8,
            bottom: 8,
            fontSize: 11,
            color: '#b45309',
            backgroundColor: 'rgba(255,255,255,.9)',
            padding: 4,
            borderRadius: 6,
          }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export default MapSurface;
