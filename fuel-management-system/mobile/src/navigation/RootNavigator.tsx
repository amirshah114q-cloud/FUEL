import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import {
  DriverTabsParamList,
  OfficeTabsParamList,
  RootStackParamList
} from '../types/navigation';
import { colors } from '../theme';

import LoginScreen from '../screens/LoginScreen';
import SplashScreen from '../screens/SplashScreen';
import DriverHomeScreen from '../screens/driver/DriverHomeScreen';
import UploadSlipScreen from '../screens/driver/UploadSlipScreen';
import SlipPreviewScreen from '../screens/driver/SlipPreviewScreen';
import OcrReviewScreen from '../screens/driver/OcrReviewScreen';
import MyFuelEntriesScreen from '../screens/driver/MyFuelEntriesScreen';
import DashboardScreen from '../screens/office/DashboardScreen';
import FuelRecordsScreen from '../screens/office/FuelRecordsScreen';
import DriversScreen from '../screens/office/DriversScreen';
import DriverFormScreen from '../screens/office/DriverFormScreen';
import VehiclesScreen from '../screens/office/VehiclesScreen';
import VehicleFormScreen from '../screens/office/VehicleFormScreen';
import UsersScreen from '../screens/office/UsersScreen';
import UserFormScreen from '../screens/office/UserFormScreen';
import ReportsScreen from '../screens/office/ReportsScreen';
import MoreScreen from '../screens/office/MoreScreen';
import EntryDetailScreen from '../screens/shared/EntryDetailScreen';
import ProfileScreen from '../screens/shared/ProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const DriverTabs = createBottomTabNavigator<DriverTabsParamList>();
const OfficeTabs = createBottomTabNavigator<OfficeTabsParamList>();

function DriverTabsNavigator(): JSX.Element {
  return (
    <DriverTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof DriverTabsParamList, string> = {
            Home: 'home-outline',
            MyEntries: 'list-outline',
            Profile: 'person-outline'
          };
          return <Ionicons name={icons[route.name] as never} size={size} color={color} />;
        }
      })}
    >
      <DriverTabs.Screen name="Home" component={DriverHomeScreen} options={{ tabBarLabel: 'Home' }} />
      <DriverTabs.Screen name="MyEntries" component={MyFuelEntriesScreen} options={{ tabBarLabel: 'My Entries' }} />
      <DriverTabs.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </DriverTabs.Navigator>
  );
}

function OfficeTabsNavigator(): JSX.Element {
  return (
    <OfficeTabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<keyof OfficeTabsParamList, string> = {
            Dashboard: 'stats-chart-outline',
            Records: 'receipt-outline',
            Drivers: 'people-outline',
            Vehicles: 'car-outline',
            More: 'ellipsis-horizontal-outline'
          };
          return <Ionicons name={icons[route.name] as never} size={size} color={color} />;
        }
      })}
    >
      <OfficeTabs.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarLabel: 'Dashboard' }} />
      <OfficeTabs.Screen name="Records" component={FuelRecordsScreen} options={{ tabBarLabel: 'Records' }} />
      <OfficeTabs.Screen name="Drivers" component={DriversScreen} options={{ tabBarLabel: 'Drivers' }} />
      <OfficeTabs.Screen name="Vehicles" component={VehiclesScreen} options={{ tabBarLabel: 'Vehicles' }} />
      <OfficeTabs.Screen name="More" component={MoreScreen} options={{ tabBarLabel: 'More' }} />
    </OfficeTabs.Navigator>
  );
}

/** Role-based root: login → (driver | office) stacks, plus flows for each role. */
export default function RootNavigator(): JSX.Element {
  const { status, user } = useAuth();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.bg,
      primary: colors.primary
    }
  };

  if (status === 'restoring') {
    return (
      <NavigationContainer theme={navTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={SplashScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        {user?.role === 'driver' ? (
          <>
            <Stack.Screen name="DriverTabs" component={DriverTabsNavigator} />
            <Stack.Screen name="UploadSlip" component={UploadSlipScreen} />
            <Stack.Screen name="SlipPreview" component={SlipPreviewScreen} />
            <Stack.Screen name="OcrReview" component={OcrReviewScreen} />
            <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
          </>
        ) : user ? (
          <>
            <Stack.Screen name="OfficeTabs" component={OfficeTabsNavigator} />
            <Stack.Screen name="DriverForm" component={DriverFormScreen} />
            <Stack.Screen name="VehicleForm" component={VehicleFormScreen} />
            <Stack.Screen name="Users" component={UsersScreen} />
            <Stack.Screen name="UserForm" component={UserFormScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}