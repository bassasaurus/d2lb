import React, { useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { useFormikContext } from 'formik';
import AppContext from './AppContext';

// Navigation keeps forms mounted when opening a related create screen. Only
// removing the form (Back, swipe, reset) requires a discard decision.
export default function UnsavedFormGuard({ savedNavigation, draftHandle }) {
  const { dirty, isSubmitting } = useFormikContext();
  const navigation = useNavigation();
  const route = useRoute();
  const { formGuards } = useContext(AppContext);
  const prompting = useRef(false);
  const state = useRef();
  state.current = { dirty, isSubmitting, savedNavigation, draftHandle };

  useEffect(() => {
    formGuards.current.set(route.key, () => ({
      flushDraft: () => state.current.draftHandle?.current?.flush(),
      open: !state.current.savedNavigation.current,
      dirty: state.current.dirty && !state.current.savedNavigation.current,
      saving: state.current.isSubmitting && !state.current.savedNavigation.current,
    }));
    return () => { formGuards.current.delete(route.key); };
  }, [formGuards, route.key]);

  useEffect(() => {
    if (dirty && !isSubmitting) savedNavigation.current = false;
  }, [dirty, isSubmitting, savedNavigation]);

  usePreventRemove(dirty || isSubmitting, ({ data }) => {
    if (savedNavigation.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (prompting.current) return;
    prompting.current = true;
    const close = () => { prompting.current = false; };
    if (isSubmitting) {
      Alert.alert('Saving changes', 'Please wait until this save finishes.', [
        { text: 'OK', onPress: close },
      ], { cancelable: true, onDismiss: close });
      return;
    }
    const leave = async discard => {
      try {
        if (discard) await draftHandle.current.discardAndClose();
        else await draftHandle.current.flush();
        close();
        navigation.dispatch(data.action);
      } catch {
        close();
        Alert.alert('Could not save your draft', 'Keep this form open and try again.');
      }
    };
    Alert.alert('Leave unfinished form?', 'Keep a draft to resume later, or discard these unfinished changes.', [
      { text: 'Keep editing', style: 'cancel', onPress: close },
      { text: 'Save draft and leave', onPress: () => leave(false) },
      { text: 'Discard draft', style: 'destructive', onPress: () => leave(true) },
    ], { cancelable: true, onDismiss: close });
  });
  return null;
}
