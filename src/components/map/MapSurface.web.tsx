import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { MAP_HTML } from '@/lib/mapHtml';

import type { MapCommand, MapEvent, MapSurfaceHandle } from './shared';

export interface MapSurfaceProps {
  dark: boolean;
  height?: number;
  onEvent?: (event: MapEvent) => void;
}

/** نسخة الويب: iframe + srcDoc، ونفس صفحة الخريطة تُستخدم على الجوال داخل WebView */
export const MapSurface = forwardRef<MapSurfaceHandle, MapSurfaceProps>(function MapSurface(
  { dark, height = 300, onEvent },
  ref,
) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const readyRef = useRef(false);
  const queueRef = useRef<MapCommand[]>([]);
  const [error, setError] = useState<string | null>(null);

  const deliver = useCallback((cmd: MapCommand) => {
    const win = frameRef.current?.contentWindow;
    if (readyRef.current && win) win.postMessage(cmd, '*');
    else queueRef.current.push(cmd);
  }, []);

  useImperativeHandle(ref, () => ({ send: deliver }), [deliver]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const data = event.data as MapEvent | undefined;
      if (!data || typeof data !== 'object' || typeof (data as { type?: unknown }).type !== 'string') return;
      if (data.type === 'ready') {
        readyRef.current = true;
        const pending = queueRef.current;
        queueRef.current = [];
        pending.forEach(deliver);
      }
      if (data.type === 'error') setError(data.message);
      onEvent?.(data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [deliver, onEvent]);

  useEffect(() => {
    deliver({ type: 'theme', dark });
  }, [dark, deliver]);

  return (
    <View style={{ height, overflow: 'hidden', borderRadius: 12, backgroundColor: dark ? '#0f1720' : '#e8eef3' }}>
      <iframe
        ref={frameRef}
        title="map"
        srcDoc={MAP_HTML}
        sandbox="allow-scripts allow-same-origin allow-popups"
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
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
