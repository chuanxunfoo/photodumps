/**
 * Deep imports into expo-notifications — avoids the package root `index.js`,
 * which side-imports push-token auto-registration and pulls in `expo-application`
 * (Metro can fail to resolve `./ExpoApplication` from that chain in some setups).
 */
export { default as scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
export { default as cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
export { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
export { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
export { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
export { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
export { default as setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
