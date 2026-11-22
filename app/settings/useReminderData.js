import { reminderEvents } from './reminderEvents.mjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { flightScope, tokenPartition } from '../storage/flights';
import { reminderCache } from './reminderStorage';

export default function useReminderData(kind = 'alerts', refreshVersion) {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const generation = useRef(0);
  const responseVersion = useRef(0);
  const eventVersion = useRef(0);
  const source = useRef(Symbol('reminder-data'));
  useEffect(() => {
    let active = true;
    const unsubscribe = reminderEvents.subscribe(async event => {
      if (event.type !== 'data' || event.kind !== kind || event.source === source.current) return;
      const version = ++eventVersion.current;
      const partition = await tokenPartition();
      if (!active || await flightScope() !== event.scope || await tokenPartition() !== partition || eventVersion.current !== version) return;
      responseVersion.current += 1;
      setSnapshot({ ...event.snapshot, scope: event.scope, partition });
      setOffline(false);
      setLoading(false);
    });
    return () => { active = false; unsubscribe(); };
  }, [kind]);
  useFocusEffect(useCallback(() => {
    const request = ++generation.current;
    setSnapshot(null);
    const controller = new AbortController();
    let running = false;
    let lastDay = new Date().toISOString().slice(0, 10);
    let scope;
    let partition;
    const current = async version => generation.current === request && responseVersion.current === version && await tokenPartition() === partition;
    async function load() {
      if (running) return;
      running = true;
      const version = ++responseVersion.current;
      try {
        const nextPartition = await tokenPartition();
        const nextScope = await flightScope();
        if (generation.current !== request) return;
        if (partition !== nextPartition || scope !== nextScope) {
          partition = nextPartition;
          scope = nextScope;
          setSnapshot(null);
        }
        setLoading(true);
        const cached = await reminderCache.read(scope, kind);
        if (cached && await current(version)) setSnapshot({ ...cached, scope, partition, cached: true });
        const { data } = await api.get(kind === 'manage' ? '/api/mobile/reminders/manage/' : '/api/mobile/reminders/', { signal: controller.signal });
        if (!await current(version)) return;
        const fresh = { data, updatedAt: Date.now(), scope, partition };
        // A storage failure must not hide a successful server response.
        try { await reminderCache.write(scope, kind, data, fresh.updatedAt, source.current); } catch { /* Keep the live response. */ }
        if (await current(version)) { setSnapshot(fresh); setOffline(false); }
      } catch {
        if (generation.current === request) setOffline(true);
      } finally {
        running = false;
        if (generation.current === request) setLoading(false);
      }
    }
    load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    const timer = setInterval(() => {
      const day = new Date().toISOString().slice(0, 10);
      if (day !== lastDay) { lastDay = day; load(); }
    }, 60000);
    return () => { generation.current += 1; controller.abort(); subscription.remove(); clearInterval(timer); };
  }, [kind, refreshVersion, refreshKey]));
  async function replace(patch, beforeChange) {
    if (!snapshot || await tokenPartition() !== snapshot.partition) return;
    responseVersion.current += 1;
    const data = { ...snapshot.data, ...patch };
    const next = { ...snapshot, data };
    try { await reminderCache.write(snapshot.scope, kind, data, next.updatedAt, source.current); } catch { /* Preserve live data. */ }
    if (await tokenPartition() === snapshot.partition) { beforeChange?.(); setSnapshot(next); }
  }
  return { replace, cached: !!snapshot?.cached, data: snapshot?.data, updatedAt: snapshot?.updatedAt, loading, offline,
    refresh: () => setRefreshKey(value => value + 1) };
}
