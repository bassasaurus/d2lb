import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { flightScope } from '../storage/flights';
import { regulatoryPreferences } from './regulatoryPreferenceStorage';
import { reminderEvents } from './reminderEvents.mjs';

export default function useRegulatoryPreferences() {
  const [snapshot, setSnapshot] = useState(null);
  const scopeRef = useRef(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSnapshot(null); scopeRef.current = null;
    async function load() {
      const scope = await flightScope();
      const cached = await regulatoryPreferences.read(scope);
      if (!active) return;
      scopeRef.current = scope;
      setSnapshot(cached);
      try { await regulatoryPreferences.sync(scope); } catch { /* Keep saved choices queued while offline. */ }
    }
    load().catch(() => {});
    const unsubscribe = reminderEvents.subscribe(event => {
      if (active && event.type === 'regulatory-preferences' && event.scope === scopeRef.current) setSnapshot(event.snapshot);
    });
    const connection = NetInfo.addEventListener(state => { if (state.isConnected && state.isInternetReachable !== false) load().catch(() => {}); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') load().catch(() => {}); });
    return () => { active = false; scopeRef.current = null; unsubscribe(); connection(); app.remove(); };
  }, []));
  async function save(row, action, days, beforeChange) {
    const scope = scopeRef.current;
    if (!scope || await flightScope() !== scope) throw new Error('Account changed.');
    const next = await regulatoryPreferences.set(scope, row, action, days);
    if (scopeRef.current === scope) { beforeChange?.(); setSnapshot(next); }
    // Offline changes have already been saved durably; upload without blocking the UI.
    regulatoryPreferences.sync(scope).catch(() => {});
  }
  return { preferences: snapshot?.preferences || {}, pending: !!Object.keys(snapshot?.pending || {}).length, ready: !!snapshot, save };
}
