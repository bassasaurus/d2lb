import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';

const OverlayContext = createContext(null);
export function usePickerOverlay() { return useContext(OverlayContext); }

// A sibling of the ScrollView keeps the results above fields without changing
// layout or placing touch targets outside a small input parent's hit area.
export default function PickerOverlayHost({ children }) {
  const host = useRef(null);
  const version = useRef(0);
  const [overlay, setOverlay] = useState(null);
  const show = useCallback((anchor, content, close) => {
    const current = ++version.current;
    host.current?.measureInWindow((hostX, hostY) => {
      if (current !== version.current) return;
      setOverlay({ left: anchor.x - hostX, top: anchor.y + anchor.height - hostY + 4,
        width: anchor.width, content, close });
    });
  }, []);
  const hide = useCallback(() => { ++version.current; setOverlay(null); }, []);
  const value = useMemo(() => ({ show, hide }), [show, hide]);
  return <OverlayContext.Provider value={value}>
    <View ref={host} collapsable={false} style={{ flex: 1 }}>
      {children}
      {overlay && <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 20 }}>
        <Pressable accessibilityLabel="Dismiss tailnumber results" onPress={() => { overlay.close(); Keyboard.dismiss(); }}
          style={{ position: 'absolute', top: overlay.top, bottom: 0, left: 0, right: 0 }} />
        <View style={{ position: 'absolute', left: overlay.left, top: overlay.top, width: overlay.width }}>
          {overlay.content}
        </View>
      </View>}
    </View>
  </OverlayContext.Provider>;
}
