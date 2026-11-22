import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/axiosConfig';
import { flightScope, flightStore, tokenPartition } from '../storage/flights';

export default function useProfile() {
  const [profile, setProfile] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    const controller = new AbortController();
    (async () => {
      setRefreshing(true);
      try {
        const partition = await tokenPartition();
        const current = async () => active && await tokenPartition() === partition;
        const scope = await flightScope();
        const store = await flightStore();
        const cached = (await store.reference(scope, 'profile'))[0];
        if (await current()) setProfile(cached || null);
        const { data } = await api.get('/api/mobile/profile/', { signal: controller.signal });
        if (!await current()) return;
        await store.cacheReference(scope, 'profile', [data]);
        if (await current()) { setProfile(data); setMessage(''); }
      } catch (error) {
        if (active) setMessage(error.response?.status === 404
          ? 'Profile needs the matching Django API update.'
          : 'Could not refresh saved information. Check your connection and try again.');
      } finally { if (active) setRefreshing(false); }
    })();
    return () => { active = false; controller.abort(); };
  }, [refreshKey]));
  return { profile, refreshing, message, refresh: () => setRefreshKey(value => value + 1) };
}
