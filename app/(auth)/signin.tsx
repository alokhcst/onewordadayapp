// Import React hooks: useState for component state, useEffect for side effects
import { useEffect, useState } from 'react';
// Import React Native UI components for building the sign-in form
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
// Import useRouter hook from Expo Router for navigation
import { useRouter } from 'expo-router';
// Import useAuth hook to access authentication functions and state
import { useAuth } from '@/contexts/AuthContext';
// Import useToast hook to show error messages
import { useToast } from '@/contexts/ToastContext';

// Main sign-in screen component
export default function SignInScreen() {
  // Get router object for navigation
  const router = useRouter();
  // Get authentication functions: signIn for email/password, signInWithGoogle for OAuth, isAuthenticated for auth state
  const { signIn, signInWithGoogle, isAuthenticated } = useAuth();
  // Get showError function to display error toast messages
  const { showError } = useToast();
  // State variable to store email input value
  const [email, setEmail] = useState('');
  // State variable to store password input value
  const [password, setPassword] = useState('');
  // State variable to track if email/password sign-in is in progress
  const [isLoading, setIsLoading] = useState(false);
  // State variable to track if Google sign-in is in progress
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Effect hook that runs when isAuthenticated or router changes
  // Navigate if already authenticated (prevents showing sign-in screen to logged-in users)
  useEffect(() => {
    // If user is already authenticated, redirect to main app (tabs)
    if (isAuthenticated) {
      // Replace current screen (can't go back to sign-in)
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]); // Re-run when authentication state or router changes

  // Async function to handle email/password sign-in
  const handleSignIn = async () => {
    // Validate that both email and password are filled in
    if (!email || !password) {
      // Show error toast if validation fails
      showError('Please fill in all fields');
      // Exit early - don't proceed with sign-in
      return;
    }

    // Set loading state to true (disables button, shows loading indicator)
    setIsLoading(true);
    try {
      // Call AWS Cognito to authenticate user with email and password
      await signIn(email, password);
      // Navigation will happen automatically via useEffect when isAuthenticated changes
      // No need to manually navigate here
    } catch (error: any) {
      // Handle errors, but don't show error if user is already signed in
      // (This is handled gracefully by the auth context)
      if (!error.message?.includes('already a signed in user') && !error.message?.includes('already signed in')) {
        // Show error message to user, or default message if none provided
        showError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      // Always reset loading state, even if there was an error
      setIsLoading(false);
    }
  };

  // Async function to handle Google OAuth sign-in
  const handleGoogleSignIn = async () => {
    // Set Google loading state to true
    setIsGoogleLoading(true);
    try {
      // Initiate Google OAuth flow - this will redirect user to Google sign-in
      await signInWithGoogle();
      // User will be redirected to Google's sign-in page, then back to app
      // Navigation happens automatically after successful OAuth
    } catch (error: any) {
      // If Google sign-in fails, show error message
      showError(error.message || 'Failed to sign in with Google');
    } finally {
      // Always reset loading state
      setIsGoogleLoading(false);
    }
  };

  // Return the JSX UI for the sign-in screen
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* KeyboardAvoidingView prevents keyboard from covering input fields */}
      {/* Different behavior for iOS (padding) vs Android (height adjustment) */}
      {/* ScrollView allows content to scroll if keyboard takes up space */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header section with title and subtitle */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to continue your learning journey</Text>
        </View>

        {/* Form container with all input fields and buttons */}
        <View style={styles.form}>
          {/* Email input group */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            {/* Email text input - controlled component */}
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password input group */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            {/* Password text input - controlled component */}
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {/* Sign-in button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {/* Button text changes based on loading state */}
            <Text style={styles.buttonText}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Divider between email/password and Google sign-in */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google sign-in button */}
          <TouchableOpacity
            style={[styles.googleButton, isGoogleLoading && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {/* Button text changes based on loading state */}
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'Signing In...' : '🔐 Sign in with Google'}
            </Text>
          </TouchableOpacity>

          {/* Link to sign-up screen */}
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <View style={styles.linkRow}>
              <Text style={styles.linkText}>Don&apos;t have an account?</Text>
              <Text style={[styles.linkText, styles.linkTextBold]}>Sign Up</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 30,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4285F4',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#4285F4',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 6,
  },
  linkText: {
    fontSize: 16,
    color: '#666',
  },
  linkTextBold: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});

