import { reminderEvents } from './reminderEvents.mjs';
import { createReminderPreferences } from './reminderPreferences.mjs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flightScope } from '../storage/flights';
import { createReminderCache } from './reminderCache.mjs';
import { clearResourcePreferences } from './reminderSnoozes.mjs';
export const reminderCache = createReminderCache(AsyncStorage, reminderEvents.publish);

const preferences = createReminderPreferences(AsyncStorage, reminderEvents.publish);
export const updateReminderPreferences = (scope, update, source) => preferences.update(scope, update, source);

export async function resetReminderPreferences(resource) {
  const scope = await flightScope();
  await updateReminderPreferences(scope, saved => clearResourcePreferences(saved, resource));
  await reminderCache.invalidate(scope);
}
