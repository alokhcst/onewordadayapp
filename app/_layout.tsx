import 'react-native-get-random-values';
import '@aws-amplify/react-native';
// Import theme providers from React Navigation - provides dark/light theme support
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// Import Stack navigator from Expo Router - main navigation structure
import { Stack } from 'expo-router';
// Import SplashScreen API to control when splash screen is hidden
import * as SplashScreen from 'expo-splash-screen';
// Import StatusBar component to control device status bar appearance
import { StatusBar } from 'expo-status-bar';
// Import useEffect hook to run side effects (hide splash screen)
import { useEffect } from 'react';
// Import Reanimated library - required for animations in Expo Router
import 'react-native-reanimated';
// Import custom hook to detect device color scheme (dark/light mode)
import { useColorScheme } from '@/hooks/useColorScheme';
// Import function to configure AWS Amplify (Cognito, API Gateway, etc.)
import { configureAmplify } from '@/lib/aws-config';
// Import AuthProvider context - provides authentication state and functions to entire app
import { AuthProvider } from '@/contexts/AuthContext';
// Import ToastProvider context - provides toast notification functions to entire app
import { ToastProvider } from '@/contexts/ToastContext';

// Prevent the splash screen from auto-hiding before asset loading is complete
// This ensures splash screen stays visible until we manually hide it
SplashScreen.preventAutoHideAsync();

// Configure AWS Amplify with Cognito, API Gateway endpoints, etc.
// This must be called before any AWS services are used
configureAmplify();

// Root layout component - wraps entire app and provides global context
export default function RootLayout() {
  // Get the device's color scheme (dark or light mode)
  const colorScheme = useColorScheme();

  // Effect hook that runs once when component mounts
  useEffect(() => {
    // Hide the splash screen once app is ready
    SplashScreen.hideAsync();
  }, []); // Empty dependency array means this runs only once on mount

  // Return the app structure with providers wrapping everything
  return (
    // ToastProvider is outermost - provides toast notifications globally
    <ToastProvider>
      {/* AuthProvider wraps auth functionality - provides user state, sign in/out functions */}
      <AuthProvider>
        {/* ThemeProvider applies dark/light theme based on device settings */}
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* Stack navigator - main navigation structure for the app */}
          <Stack>
            {/* Auth group - all authentication screens (signin, signup, confirm) */}
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            {/* Tabs group - main app screens (today's word, history, profile) */}
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* 404 screen - shown when route doesn't exist */}
            <Stack.Screen name="+not-found" />
          </Stack>
          {/* StatusBar component - controls device status bar (auto adapts to theme) */}
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
