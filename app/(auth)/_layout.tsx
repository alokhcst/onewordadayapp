import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="signin" options={{ title: 'Sign In', headerBackTitle: 'Back' }} />
      <Stack.Screen name="signup" options={{ title: 'Sign Up', headerBackTitle: 'Back' }} />
      <Stack.Screen name="confirm" options={{ title: 'Confirm Email', headerBackTitle: 'Back' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
  );
}

