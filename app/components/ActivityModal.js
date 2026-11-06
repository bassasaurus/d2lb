import React, { useContext } from 'react';
import { Modal, View } from 'react-native';
import AppContext from './AppContext';
import { useAppTheme } from '../theme/ThemeProvider';
import LogoLoading from './LogoLoading';

export default function ActivityModal({ label = 'Loading…' }) {
  const { activityVisibleValue: visible } = useContext(AppContext);
  const { colors } = useAppTheme();
  return <Modal visible={visible} transparent statusBarTranslucent>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
      <LogoLoading label={label} />
    </View>
  </Modal>;
}
