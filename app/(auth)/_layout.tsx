// Import Stack navigator from Expo Router - provides navigation between screens in this group
import { Stack } from 'expo-router';

// Layout component that defines the navigation structure for the authentication flow
// This wraps all auth screens (signin, signup, confirm, etc.) in a Stack navigator
export default function AuthLayout() {
  return (
    // Stack navigator - allows navigation between screens with back button support
    <Stack>
      {/* Welcome screen - first screen users see, no header shown */}
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      {/* Sign in screen - shows "Sign In" as title, back button says "Back" */}
      <Stack.Screen name="signin" options={{ title: 'Sign In', headerBackTitle: 'Back' }} />
      {/* Sign up screen - shows "Sign Up" as title, back button says "Back" */}
      <Stack.Screen name="signup" options={{ title: 'Sign Up', headerBackTitle: 'Back' }} />
      {/* Email confirmation screen - shows "Confirm Email" as title, back button says "Back" */}
      <Stack.Screen name="confirm" options={{ title: 'Confirm Email', headerBackTitle: 'Back' }} />
      {/* Onboarding screen - no header shown (full screen experience) */}
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

