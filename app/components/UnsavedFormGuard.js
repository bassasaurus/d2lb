import React, { useContext, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, usePreventRemove, useRoute } from '@react-navigation/native';
import { useFormikContext } from 'formik';
import AppContext from './AppContext';

// Navigation keeps forms mounted when opening a related create screen. Only
// removing the form (Back, swipe, reset) requires a discard decision.
export default function UnsavedFormGuard({ savedNavigation }) {
  const { dirty, isSubmitting } = useFormikContext();
  const navigation = useNavigation();
  const route = useRoute();
  const { formGuards } = useContext(AppContext);
  const prompting = useRef(false);
  const state = useRef();
  state.current = { dirty, isSubmitting, savedNavigation };

  useEffect(() => {
    formGuards.current.set(route.key, () => ({
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
    Alert.alert('Discard unfinished changes?', 'Your changes have not been saved.', [
      { text: 'Keep editing', style: 'cancel', onPress: close },
      { text: 'Discard changes', style: 'destructive', onPress: () => {
        close();
        navigation.dispatch(data.action);
      } },
    ], { cancelable: true, onDismiss: close });
  });
  return null;
}
