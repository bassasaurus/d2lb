import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import { session } from '../auth/session';
import { flightScope, tokenPartition } from '../storage/flights';
import { reminderEvents } from './reminderEvents.mjs';
import { createMedicalPreferences } from './medicalPreferences.mjs';

export const medicalPreferences = createMedicalPreferences(AsyncStorage, async (scope, preference) => {
  const partition = await tokenPartition();
  const token = await session.getToken();
  if (await flightScope() !== scope || await tokenPartition() !== partition) throw new Error('Account changed.');
  const url = '/api/mobile/reminders/medical/preferences/';
  const result = preference === null ? await api.get(url, { pinnedToken: token })
    : await api.put(url, preference, { pinnedToken: token });
  if (await tokenPartition() !== partition || await flightScope() !== scope) throw new Error('Account changed.');
  return result.data;
}, (scope, snapshot) => reminderEvents.publish({ type: 'medical-preferences', scope, snapshot }));
