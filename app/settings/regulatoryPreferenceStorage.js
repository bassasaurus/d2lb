import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/axiosConfig';
import { session } from '../auth/session';
import { flightScope, tokenPartition } from '../storage/flights';
import { reminderEvents } from './reminderEvents.mjs';
import { createRegulatoryPreferences } from './regulatoryPreferences.mjs';

export const regulatoryPreferences = createRegulatoryPreferences(AsyncStorage, async (scope, operation) => {
  const partition = await tokenPartition();
  const token = await session.getToken();
  if (await flightScope() !== scope || await tokenPartition() !== partition) throw new Error('Account changed.');
  const url = '/api/mobile/reminders/preferences/';
  const response = operation ? await api.post(url, operation, { pinnedToken: token }) : await api.get(url, { pinnedToken: token });
  if (await flightScope() !== scope || await tokenPartition() !== partition) throw new Error('Account changed.');
  return response.data;
}, (scope, snapshot) => reminderEvents.publish({ type: 'regulatory-preferences', scope, snapshot }));
