import useRegulatoryPreferences from './useRegulatoryPreferences';
import { regulatoryKey, regulatoryHidden } from './regulatoryPreferences.mjs';
import useMedicalPreferences from './useMedicalPreferences';
import { medicalDismissed, medicalUntil, snoozeUntil, medicalStageEnd } from './medicalPreferences.mjs';
import { reminderEvents } from './reminderEvents.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { updateReminderPreferences } from './reminderStorage';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flightScope } from '../storage/flights';
import { parseSnoozes } from './reminderSnoozes.mjs';

export default function useReminderSnoozes() {
  const medical = useMedicalPreferences();
  const regulatory = useRegulatoryPreferences();
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
  const stage = saved.medicalStage;
  function medicalPreference(row) {
    return stage && stage.generation === medical.generation && stage.due === row?.due_date && stage.severity === row?.severity
      ? { ...medical.preference, until: stage.until } : medical.preference;
  }
  return {
    saved, now, ready: !!storageKey && regulatory.ready, regulatory,
    hidden: row => regulatoryHidden(regulatory.preferences[regulatoryKey(row)], row, now),
    medical: { ...medical, preferenceFor: medicalPreference },
    snoozeMedicalStage: (row, beforeChange) => persist(previous => ({ ...previous,
      medicalStage: { due: row.due_date, severity: row.severity, until: medicalStageEnd(row), generation: medical.generation },
    }), beforeChange),
    dismissed: row => row ? row.medical ? medicalDismissed(row, medicalPreference(row)) : regulatory.preferences[regulatoryKey(row)]?.mode === 'until_red' && regulatoryHidden(regulatory.preferences[regulatoryKey(row)], row, now) : false,
    dismissIFR: (row, beforeChange) => regulatory.save(row, 'dismiss', null, beforeChange),
    dismissCaution: (row, beforeChange) => row.medical ? medical.save({ caution_due: row.due_date }, beforeChange) : regulatory.save(row, 'dismiss', null, beforeChange),
    until: row => row ? row.medical ? medicalUntil(medicalPreference(row), now) : regulatoryHidden(regulatory.preferences[regulatoryKey(row)], row, now) && regulatory.preferences[regulatoryKey(row)]?.until ? Date.parse(`${regulatory.preferences[regulatoryKey(row)].until}T00:00:00Z`) : null : null,
    snooze: (row, days, beforeChange) => row.medical ? medical.save({ until: snoozeUntil(days) }, beforeChange) : regulatory.save(row, 'snooze', days, beforeChange),
    showNow: (row, beforeChange) => row.medical ? (async () => { await persist(previous => { const next = { ...previous }; delete next.medicalStage; return next; }); await medical.save({}, beforeChange); })() : regulatory.save(row, 'restore', null, beforeChange),
  };
}
