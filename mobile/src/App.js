/**
 * Mobile-Technologies React Native App
 * Advanced Mobile Biometric eKYC Platform
 */

import React, {useEffect} from 'react';
import {
  StatusBar,
  SafeAreaView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {check, request, PERMISSIONS, RESULTS} from 'react-native-permissions';
import LinearGradient from 'react-native-linear-gradient';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import IDScanScreen from './screens/IDScanScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import FacialBiometricsScreen from './screens/FacialBiometricsScreen';
import OptionalBiometricsScreen from './screens/OptionalBiometricsScreen';
import CompletionScreen from './screens/CompletionScreen';
import ConfigurationScreen from './screens/ConfigurationScreen';

// Utils
import {requestCameraPermission} from './utils/permissions';
import {initializeApp} from './utils/appInit';

const Stack = createStackNavigator();

const App = () => {
  useEffect(() => {
    // Initialize app and request permissions
    const setupApp = async () => {
      try {
        await initializeApp();
        await requestCameraPermission();
      } catch (error) {
        console.error('App initialization error:', error);
        Alert.alert(
          'Initialization Error',
          'Failed to initialize the app. Please restart and try again.',
        );
      }
    };

    setupApp();
  }, []);

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#1e40af"
        translucent={false}
      />
      <SafeAreaView style={styles.container}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Welcome"
            screenOptions={{
              headerStyle: {
                backgroundColor: '#1e40af',
                elevation: 0,
                shadowOpacity: 0,
              },
              headerTintColor: '#ffffff',
              headerTitleStyle: {
                fontWeight: 'bold',
                fontSize: 18,
              },
              headerBackground: () => (
                <LinearGradient
                  colors={['#1e40af', '#3730a3']}
                  style={StyleSheet.absoluteFill}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 0}}
                />
              ),
            }}>
            <Stack.Screen
              name="Welcome"
              component={WelcomeScreen}
              options={{
                title: 'Mobile-Technologies',
                headerLeft: null,
              }}
            />
            <Stack.Screen
              name="IDScan"
              component={IDScanScreen}
              options={{
                title: 'ID Document Scan',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="PersonalInfo"
              component={PersonalInfoScreen}
              options={{
                title: 'Verify Information',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="FacialBiometrics"
              component={FacialBiometricsScreen}
              options={{
                title: 'Facial Verification',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="OptionalBiometrics"
              component={OptionalBiometricsScreen}
              options={{
                title: 'Additional Security',
                headerBackTitleVisible: false,
              }}
            />
            <Stack.Screen
              name="Completion"
              component={CompletionScreen}
              options={{
                title: 'Verification Complete',
                headerLeft: null,
              }}
            />
            <Stack.Screen
              name="Configuration"
              component={ConfigurationScreen}
              options={{
                title: 'Settings',
                headerBackTitleVisible: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});

export default App;