import ProfileEditScreen from '../profile/ProfileEditScreen';
import { recordScreen } from '../monitoring';
import NavigationMenuButton from '../components/NavigationMenuButton';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { isRunningInExpoGo } from 'expo';
import { formatAppVersion } from '../settings/appVersion.mjs';
import Text from '../components/AppText';
import WhatsNew from '../components/WhatsNew';
import ProfileStackNavigator from './ProfileStackNavigator';
import { withScrollOverflow } from '../components/OverflowLists';
import { tailnumberScope } from '../storage/tailnumberRecords.mjs';
import { useAppTheme } from '../theme/ThemeProvider';
import React, { useContext, useEffect, useState } from "react";
import { StyleSheet, Alert, View, Pressable } from "react-native";
import { flightScope, flightStore } from "../storage/flights";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from "@react-navigation/drawer";
import { NavigationContainer, CommonActions, DrawerActions } from "@react-navigation/native";
import { PlatformPressable } from '@react-navigation/elements';
import { createStackNavigator } from "@react-navigation/stack";
import RecencyScreen from '../stats/RecencyScreen';
import StatsScreen from '../stats/StatsScreen';
import ManageRemindersScreen from "../settings/ManageRemindersScreen";
import ReminderEditScreen from "../settings/ReminderEditScreen";
import SettingsScreen from "../settings/SettingsScreen";
import PrivacyPolicyScreen from "../settings/PrivacyPolicyScreen";
import LoginScreen from "../Screens/LoginScreen";
import SyncReviewStackNavigator from "./SyncReviewStackNavigator";
import AircraftStackNavigator from "./AircraftStackNavigator";
import { aircraftScope } from "../storage/aircraft";
import FlightStackNavigator from "./FlightStackNavigator";
import AppContext from "../components/AppContext";

const OverflowDrawerContentScrollView = withScrollOverflow(DrawerContentScrollView);


const drawerRules = {
  ManageReminders: [
    'Medical: yellow within 45 days of expiry; red from the first day of the due month. Missing expiry is red. Logbook Snooze hides it until the next alert stage; red uses a timed snooze.',
    'BFR / Flight Review: due at month-end, 24 months after qualifying completion. Yellow with fewer than 30 days left; red at 14 days or fewer, including overdue.',
    'FIRC / Instructor Renewal: recorded renewal period plus 24 calendar months. Same yellow/red thresholds as BFR.',
    'IPC / IFR: based on logged recency by aircraft category. Yellow for missing requirements or approaching loss of currency; red after the calculated review date.',
    'Custom: uses your due date. Yellow with fewer than 30 days left; red at 14 days or fewer, including overdue.',
    'Only yellow/red alerts appear above the Logbook. All items remain in Reminders.',
    'Except Medical: dismiss yellow until red. Snooze 1/3/7/14 days; red overrides a yellow snooze. Dismiss red for 30 days. Timed hiding ends at 0000Z.',
    'Restore or edit to show hidden items. Choices save offline and sync through your account.',
    'Based on logged information. Verify your records.',
  ].join('\n\n'),
  ManageMilestones: [
    'Total Flight Time: all logged flight hours.',
    'Time in Type: hours in the selected aircraft type.',
    'Crew Position in Type: selected crew-position hours in that type.',
    'Time at Company: all flight hours in the selected date range, regardless of crew position. Company is the label.',
    'Flight Condition: selected PIC, SIC, Solo, Dual, CFI, Sim or XC hours.',
    'All types: more than 10 hours remaining appears only in Milestones. At 10 hours remaining, green text appears above the Logbook. At or above target, a green card with black text appears.',
    'Completed first, then closest to target.',
    'Dismiss until edited or restored; no timed snooze. Dismissed items remain in Milestones with Restore.',
    'Choices save offline and sync through your account.',
  ].join('\n\n'),
};

const Drawer = createDrawerNavigator();
const Root = createStackNavigator();

function DrawerNavigator({ navigation }) {
  const { colors, navigationTheme } = useAppTheme();
  const Context = useContext(AppContext);
  const version = formatAppVersion({
    projectVersion: Constants.expoConfig?.version,
    nativeVersion: Application.nativeApplicationVersion,
    buildVersion: Application.nativeBuildVersion,
    expoGo: isRunningInExpoGo(),
    development: __DEV__,
  });



  function LogoutContent(props) {
    const [showReleaseNotes, setShowReleaseNotes] = useState(false);
    return (
      <View style={styles.container}>
        <OverflowDrawerContentScrollView {...props} style={styles.container}>
          {props.state.routes.map((route, index) => {
            const focused = index === props.state.index;
            const options = props.descriptors[route.key].options;
            const title = options.title || route.name;
            const rules = drawerRules[route.name];
            const onPress = () => {
              const event = props.navigation.emit({ type: 'drawerItemPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) props.navigation.dispatch({
                ...(focused ? DrawerActions.closeDrawer() : CommonActions.navigate(route.name, route.params)),
                target: props.state.key,
              });
            };
            if (!rules) return <DrawerItem key={route.key} label={title} focused={focused} onPress={onPress} />;
            return <PlatformPressable key={route.key} onPress={onPress}
              onLongPress={() => Alert.alert(`${title} Rules`, rules)}
              accessibilityRole="button" accessibilityLabel={title}
              accessibilityState={{ selected: focused }} accessibilityHint="Long press to view display rules"
              accessibilityActions={[{ name: 'longpress', label: 'Show display rules' }]}
              onAccessibilityAction={({ nativeEvent }) => {
                if (nativeEvent.actionName === 'longpress') Alert.alert(`${title} Rules`, rules);
              }}
              testID={`drawer-${route.name}-rules`}
              style={{ borderRadius: 56, paddingVertical: 15, paddingLeft: 16, paddingRight: 24,
                backgroundColor: focused ? navigationTheme.colors.primary + '1f' : 'transparent' }}>
              <Text weight="500" style={{ lineHeight: 24 }} color={focused ? navigationTheme.colors.primary : colors.muted}>{title}</Text>
            </PlatformPressable>;
          })}
        </OverflowDrawerContentScrollView>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 12 }}>
          <DrawerItem
            label='Logout'
            onPress={async () => {
              const logout = async () => {
                const forms = [...Context.formGuards.current.values()].map(read => read());
                await Promise.all(forms.map(form => form.flushDraft?.()));
                await Context.signOut();
              };
              try {
                const forms = [...Context.formGuards.current.values()].map(read => read());
                if (forms.some(form => form.saving)) {
                  Alert.alert("Saving changes", "Please wait until this save finishes.");
                  return;
                }
                const dirty = forms.some(form => form.dirty);
                const store = await flightStore();
                const scope = await flightScope();
                const pending = await store.pendingCount(scope) + await store.pendingCount(aircraftScope(scope)) + await store.pendingCount(tailnumberScope(scope));
                if (dirty || pending) {
                  const message = [
                    dirty ? "Your unfinished forms will close. Saved drafts remain on this device." : "",
                    pending ? `${pending} change(s) are saved only on this device. They will remain stored, but will be hidden while signed out.` : "",
                  ].filter(Boolean).join("\n\n");
                  Alert.alert(dirty ? "Save drafts and sign out?" : "Unsynced changes", message, [
                    { text: dirty ? "Keep editing" : "Stay signed in", style: "cancel" },
                    { text: "Sign out", style: "default",
                      onPress: () => logout().catch(() => Alert.alert("Unable to sign out")) },
                  ]);
                } else {
                  await logout();
                }
              } catch (error) {
                Alert.alert("Unable to sign out", "Could not check your pending changes. Please try again.");
              }
            }}
          />
          <DrawerItem label="Privacy Policy" testID="drawer-privacy-policy"
            onPress={() => {
              props.navigation.closeDrawer();
              props.navigation.navigate('PrivacyPolicy');
            }} />
        </View>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.footer, { borderTopColor: colors.border }]}>
          <Pressable testID="drawer-release-notes" accessibilityRole="button"
            accessibilityLabel={`View release notes for version ${version}`}
            onPress={() => setShowReleaseNotes(true)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text size={14} color={colors.muted} style={{ textAlign: 'center', marginVertical: 8 }}>Version {version}</Text>
          </Pressable>
        </SafeAreaView>
        <WhatsNew visible={showReleaseNotes} onDismiss={() => setShowReleaseNotes(false)} />
      </View>
    );
  }

  if (Context.isSignedInValue) {
    return (
      <NavigationContainer theme={navigationTheme} onStateChange={recordScreen}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          <Root.Screen name="MainDrawer">
            {() => <Drawer.Navigator screenOptions={{ headerLeft: () => <NavigationMenuButton /> }} drawerContent={(props) => <LogoutContent {...props} />}>
              <Drawer.Screen name="Logbook" component={FlightStackNavigator} options={{ headerShown: false }} />
              <Drawer.Screen name="Aircraft" component={AircraftStackNavigator} options={{ headerShown: false }} />
              <Drawer.Screen name="Totals & Stats" component={StatsScreen} />
              <Drawer.Screen name="Recency" component={RecencyScreen} />
              <Drawer.Screen name="Profile" component={ProfileStackNavigator} options={{ headerShown: false }} />
              <Drawer.Screen name="ManageReminders" component={ManageRemindersScreen} initialParams={{ group: 'regulatory' }} options={{ title: 'Reminders' }} />
              <Drawer.Screen name="ManageMilestones" component={ManageRemindersScreen} initialParams={{ group: 'milestones' }} options={{ title: 'Milestones' }} />
              <Drawer.Screen name="Settings" component={SettingsScreen} />
            </Drawer.Navigator>}
          </Root.Screen>
          <Root.Screen name="SyncReview" component={SyncReviewStackNavigator} options={{ presentation: 'modal' }} />
          <Root.Screen name="EditReminder" component={ReminderEditScreen}
            options={({ route }) => ({ headerShown: true, title: route.params?.reminder ? 'Edit Reminder' : 'Add Reminder',
              headerBackButtonDisplayMode: 'minimal' })} />
          <Root.Screen name="MedicalEdit" component={ProfileEditScreen}
            options={{ headerShown: true, title: 'Update Medical', headerBackButtonDisplayMode: 'minimal' }} />
          <Root.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen}
            options={{ headerShown: true, title: 'Privacy Policy', headerBackButtonDisplayMode: 'minimal' }} />
        </Root.Navigator>
      </NavigationContainer>
    );
  } else {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <LoginScreen />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  footer: { borderTopWidth: 1, padding: 12 },
});

export default DrawerNavigator;
