import AsyncStorage from '@react-native-async-storage/async-storage';
import { monitoring } from '../monitoring';
import { createDraftStore } from './draftStore.mjs';

export const localDraftStore = createDraftStore(AsyncStorage, undefined, monitoring.report);
