import { reminderEvents } from './reminderEvents.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { updateReminderPreferences } from './reminderStorage';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flightScope } from '../storage/flights';
import { cautionDismissalKey, cautionDismissed, ifrDismissalKey, ifrDismissed, snoozeKey } from './reminderPresentation.mjs';
import { activeSnooze, parseSnoozes, withoutSnooze } from './reminderSnoozes.mjs';

export default function useReminderSnoozes() {
  const [saved, setSaved] = useState({});
  const [storageKey, setStorageKey] = useState(null);
  const [now, setNow] = useState(Date.now());
  const generation = useRef(0);
  const preferenceVersion = useRef(0);
  const eventVersion = useRef(0);
  const source = useRef(Symbol('reminder-preferences'));
  useEffect(() => {
    let active = true;
    const unsubscribe = reminderEvents.subscribe(async event => {
      if (event.type !== 'preferences' || event.source === source.current) return;
      const version = ++eventVersion.current;
      if (await flightScope() !== event.scope || !active || eventVersion.current !== version) return;
      preferenceVersion.current += 1;
      setSaved(event.saved);
      setStorageKey(event.scope);
      setNow(Date.now());
    });
    return () => { active = false; unsubscribe(); };
  }, []);
  useFocusEffect(useCallback(() => {
    const current = ++generation.current;
    setStorageKey(null);
    setSaved({});
    setNow(Date.now());
    async function reload() {
      const version = ++preferenceVersion.current;
      setNow(Date.now());
      await flightScope().then(async scope => {
        const key = `reminder-snoozes:${scope}`;
        const data = parseSnoozes(await AsyncStorage.getItem(key));
        if (generation.current === current && preferenceVersion.current === version) {
          setSaved(data);
          setStorageKey(scope);
        }
      }).catch(() => {});
    }
    reload();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') reload(); });
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => { generation.current += 1; clearInterval(timer); subscription.remove(); };
  }, []));

  async function persist(update, beforeChange) {
    if (!storageKey) throw new Error('Reminder preferences are not ready.');
    const current = generation.current;
    const version = ++preferenceVersion.current;
    const next = await updateReminderPreferences(storageKey, update, source.current);
    if (generation.current === current && preferenceVersion.current === version) {
      beforeChange?.();
      setSaved(next);
    }
  }
  return {
    saved, now, ready: !!storageKey,
    dismissed: row => row ? ifrDismissed(row, saved) || cautionDismissed(row, saved) : false,
    dismissIFR: (row, beforeChange) => persist(previous => ({ ...previous, [ifrDismissalKey(row)]: true }), beforeChange),
    dismissCaution: (row, beforeChange) => persist(previous => ({ ...previous, [cautionDismissalKey(row)]: true }), beforeChange),
    until: row => row ? activeSnooze(row, saved, now) : null,
    snooze: (row, days, beforeChange) => persist(previous => ({ ...previous, [snoozeKey(row)]: Date.now() + days * 86400000 }), beforeChange),
    showNow: (row, beforeChange) => persist(previous => {
      const next = withoutSnooze(row, previous);
      delete next[cautionDismissalKey(row)];
      if (row.kind === 'ipc') delete next[ifrDismissalKey(row)];
      return next;
    }, beforeChange),
  };
}
