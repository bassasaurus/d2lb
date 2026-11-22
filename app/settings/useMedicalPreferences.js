import { useCallback, useRef, useState } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from '@react-navigation/native';
import { flightScope } from '../storage/flights';
import { medicalPreferences } from './medicalPreferenceStorage';
import { reminderEvents } from './reminderEvents.mjs';

export default function useMedicalPreferences() {
  const [snapshot, setSnapshot] = useState(null);
  const scopeRef = useRef(null);
  useFocusEffect(useCallback(() => {
    let active = true;
    setSnapshot(null); scopeRef.current = null;
    async function load() {
      const scope = await flightScope();
      const cached = await medicalPreferences.read(scope);
      if (!active) return;
      scopeRef.current = scope;
      setSnapshot(cached);
      try { await medicalPreferences.sync(scope); } catch { /* Keep saved choices queued while offline. */ }
    }
    load().catch(() => {});
    const unsubscribe = reminderEvents.subscribe(event => {
      if (active && event.type === 'medical-preferences' && event.scope === scopeRef.current) setSnapshot(event.snapshot);
    });
    const connection = NetInfo.addEventListener(state => { if (state.isConnected && state.isInternetReachable !== false) load().catch(() => {}); });
    const app = AppState.addEventListener('change', state => { if (state === 'active') load().catch(() => {}); });
    return () => { active = false; scopeRef.current = null; unsubscribe(); connection(); app.remove(); };
  }, []));
  async function save(preference, beforeChange) {
    const scope = scopeRef.current;
    if (!scope || await flightScope() !== scope) throw new Error('Account changed.');
    const next = await medicalPreferences.set(scope, preference);
    if (scopeRef.current === scope) { beforeChange?.(); setSnapshot(next); }
    // Offline changes have already been saved durably; upload without blocking the UI.
    medicalPreferences.sync(scope).catch(() => {});
  }
  return { preference: snapshot?.preference || {}, generation: snapshot?.generation || 0, pending: !!snapshot?.pending, ready: !!snapshot, save };
}
