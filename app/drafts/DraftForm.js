import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Pressable, View } from 'react-native';
import { Formik, useFormikContext } from 'formik';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { flightScope } from '../storage/flights';
import { session } from '../auth/session';
import { useAppTheme } from '../theme/ThemeProvider';
import Text from '../components/AppText';
import UnsavedFormGuard from '../components/UnsavedFormGuard';
import { createDraftStore, draftKey, fingerprint } from './draftStore.mjs';

const store = createDraftStore(AsyncStorage);

export default function DraftForm({ kind, recordKey = 'new', draftHandle, savedNavigation, onResume, children, ...props }) {
  return <Formik {...props}>{formik => <DraftBoundary kind={kind} recordKey={recordKey}
    draftHandle={draftHandle} savedNavigation={savedNavigation} onResume={onResume}>
    {children(formik)}
  </DraftBoundary>}</Formik>;
}

function DraftBoundary({ kind, recordKey, draftHandle, savedNavigation, onResume, children }) {
  const form = useFormikContext();
  const { colors } = useAppTheme();
  const [state, setState] = useState({ loading: true, pending: null, message: null });
  const initial = useRef(form.initialValues);
  const owner = useRef(session.snapshot());
  const key = useRef(null);
  const current = useRef();
  const mounted = useRef(true);
  const completed = useRef(false);
  const timer = useRef(null);
  const enabled = useRef(false);
  const touched = useRef(false);
  const generation = useRef(0);
  current.current = form;
  const update = change => { if (mounted.current) setState(value => ({ ...value, ...change })); };
  const sameSession = () => session.snapshot().version === owner.current.version && Boolean(session.snapshot().token);
  const cancelTimer = () => { clearTimeout(timer.current); timer.current = null; };
  async function flush() {
    cancelTimer();
    if (!key.current || !enabled.current || completed.current || !sameSession()) return;
    const { dirty, values } = current.current;
    const thisGeneration = ++generation.current;
    if (!dirty && !touched.current) return;
    touched.current = true;
    try {
      if (dirty) await store.save(key.current, initial.current, values);
      else await store.remove(key.current);
      if (thisGeneration === generation.current) update({ message: dirty ? 'Draft saved on this device' : null, error: null });
    } catch {
      update({ message: null, error: 'Draft could not be saved. Keep this form open and retry.' });
      throw new Error('Could not save your draft.');
    }
  }
  async function load() {
    update({ loading: true, error: null });
    try {
      const scope = await flightScope();
      if (!sameSession()) return;
      key.current = draftKey(scope, kind, recordKey);
      const pending = await store.load(key.current);
      if (!sameSession()) return;
      enabled.current = !pending;
      update({ loading: false, pending, blocked: false });
    } catch {
      update({ loading: false, blocked: true, error: 'Could not read your saved draft. Retry or discard it before editing.' });
    }
  }
  async function discard() {
    cancelTimer();
    ++generation.current;
    if (!key.current) throw new Error('Draft storage is unavailable. Try again.');
    await store.remove(key.current);
    enabled.current = true;
    touched.current = false;
    update({ pending: null, blocked: false, error: null, message: null });
  }
  // Form submitters call this only after their local/server save has succeeded.
  draftHandle.current = {
    flush,
    async complete() {
      completed.current = true;
      cancelTimer();
      ++generation.current;
      try { if (key.current) await store.remove(key.current); }
      catch { Alert.alert('Record saved', 'The unfinished draft could not be removed. Discard it if offered when you reopen this form.'); }
    },
    discard,
    async discardAndClose() {
      await discard();
      completed.current = true;
    },
  };
  useEffect(() => {
    mounted.current = true;
    load();
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') flush().catch(() => {});
    });
    return () => {
      mounted.current = false;
      subscription.remove();
      flush().catch(() => {});
    };
  }, []);
  const serialized = fingerprint(form.values);
  useEffect(() => {
    if (enabled.current && !completed.current) {
      if (form.dirty) update({ message: 'Saving draft…' });
      cancelTimer();
      timer.current = setTimeout(() => { flush().catch(() => {}); }, 400);
    }
    return cancelTimer;
  }, [serialized, state.loading, Boolean(state.pending)]);

  const pending = state.pending;
  const stale = pending && pending.baseline !== fingerprint(initial.current);
  const action = (title, onPress, danger = false) => <Pressable accessibilityRole="button" onPress={onPress}
    style={{ paddingVertical: 10, paddingRight: 20 }}><Text style={{ color: danger ? colors.danger : colors.primary, fontWeight: '600' }}>{title}</Text></Pressable>;
  const confirmDiscard = () => Alert.alert('Discard saved draft?', 'This removes only the unfinished draft on this device.', [
    { text: 'Keep draft', style: 'cancel' },
    { text: 'Discard', style: 'destructive', onPress: () => discard().catch(error => update({ error: error.message })) },
  ]);
  return <>
    <UnsavedFormGuard savedNavigation={savedNavigation} draftHandle={draftHandle} />
    {state.loading ? <Text style={{ color: colors.muted, marginVertical: 8 }}>Checking for an unfinished draft…</Text>
      : pending || state.blocked ? <View style={{ padding: 12, marginVertical: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 6, backgroundColor: colors.selected }}>
        <Text style={{ fontWeight: '600' }}>{pending ? `Unfinished ${kind} saved · ${new Date(pending.updatedAt).toLocaleString()}` : 'Draft recovery unavailable'}</Text>
        {stale && <Text>This record changed since the draft was saved. Discard this older draft to edit the current record.</Text>}
        {state.error && <Text style={{ color: colors.danger }}>{state.error}</Text>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {pending && !stale && action('Resume draft', () => {
            enabled.current = true;
            touched.current = true;
            form.setValues(pending.values);
            onResume?.(pending.values);
            update({ pending: null, message: 'Draft saved on this device' });
          })}
          {state.blocked && action('Retry', load)}
          {action('Discard', confirmDiscard, true)}
        </View>
      </View> : <View>
        {state.message && <Text accessibilityLiveRegion="polite" style={{ color: colors.muted, fontSize: 12, marginVertical: 8 }}>{state.message}</Text>}
        {state.error && <><Text style={{ color: colors.danger }}>{state.error}</Text>{action('Retry draft save', () => flush().catch(() => {}))}</>}
      </View>}
    <View pointerEvents={state.loading || pending || state.blocked ? 'none' : 'auto'}
      accessibilityElementsHidden={Boolean(state.loading || pending || state.blocked)}
      importantForAccessibility={state.loading || pending || state.blocked ? 'no-hide-descendants' : 'auto'}
      style={{ opacity: state.loading || pending || state.blocked ? 0.5 : 1 }}>
      {children}
    </View>
  </>;
}
