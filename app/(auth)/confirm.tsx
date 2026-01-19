// Import the authentication context hook to access sign-up confirmation and sign-in functions
import { useAuth } from '@/contexts/AuthContext';
// Import the toast context hook to show success/error messages to the user
import { useToast } from '@/contexts/ToastContext';
// Import Expo Router hooks: useLocalSearchParams to get URL parameters, useRouter for navigation
import { useLocalSearchParams, useRouter } from 'expo-router';
// Import React useState hook to manage component state (form inputs, loading states)
import { useState } from 'react';
// Import React Native UI components: Alert for native alerts, Platform to detect OS, StyleSheet for styling, Text/TextInput/TouchableOpacity/View for UI
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Main component function - this is the email confirmation screen
export default function ConfirmScreen() {
  // Get the router object to navigate between screens
  const router = useRouter();
  // Get URL parameters passed from the previous screen (signup screen)
  const params = useLocalSearchParams();
  // Extract email and password from URL parameters (password is passed for auto-signin after confirmation)
  const { email, password } = params;
  // Get authentication functions from AuthContext: confirmSignUp to verify code, resendSignUpCode to resend, signIn to auto-login
  const { confirmSignUp, resendSignUpCode, signIn } = useAuth();
  // Get toast notification functions to show success/error messages
  const { showSuccess, showError } = useToast();
  // State variable to store the 6-digit verification code entered by user
  const [code, setCode] = useState('');
  // State variable to track if the confirmation request is in progress (prevents double-submission)
  const [isLoading, setIsLoading] = useState(false);
  // State variable to track if the resend code request is in progress
  const [isResending, setIsResending] = useState(false);

  // Async function to handle email confirmation when user submits the verification code
  const handleConfirm = async () => {
    // Validate that code is entered and is exactly 6 digits
    if (!code || code.length !== 6) {
      // Show error toast if validation fails
      showError('Please enter the 6-digit code');
      // Exit early - don't proceed with confirmation
      return;
    }

    // Set loading state to true to disable button and show loading indicator
    setIsLoading(true);
    try {
      // Log confirmation attempt for debugging
      console.log('Confirming signup for:', email);
      // Call AWS Cognito to confirm the sign-up with the verification code
      const result = await confirmSignUp(email as string, code);
      // Log the result for debugging
      console.log('Confirmation result:', result);
      
      // Check if user was already confirmed (edge case - user might have confirmed elsewhere)
      if (result?.alreadyConfirmed) {
        // Different UI handling for web vs mobile
        if (Platform.OS === 'web') {
          // On web, show toast message
          showSuccess('Email already verified! Redirecting to sign in...');
          // Wait 1 second then navigate to sign-in screen (replace removes this screen from history)
          setTimeout(() => {
            router.replace('/(auth)/signin');
          }, 1000);
        } else {
          // On mobile, show native alert dialog
          Alert.alert('Already Verified', 'Your email is already verified. You can sign in now!', [
            {
              text: 'Sign In',
              // When user taps "Sign In", navigate to sign-in screen
              onPress: () => router.replace('/(auth)/signin')
            }
          ]);
        }
      } else {
        // Confirmation was successful - now try to auto-sign in the user
        // Check if password was passed from signup screen (for seamless auto-login)
        if (password) {
          console.log('Auto-signing in user after confirmation...');
          try {
            // Automatically sign in the user with their email and password
            await signIn(email as string, password as string);
            console.log('User signed in successfully');
            
            // Show success message
            showSuccess('Email verified! Completing setup...');
            
            // Navigate to onboarding screen where user will complete their profile
            // Using replace so user can't go back to confirmation screen
            setTimeout(() => {
              router.replace('/(auth)/onboarding');
            }, 500);
          } catch (signInError) {
            // If auto sign-in fails (e.g., password wrong, network error), log error
            console.error('Auto sign-in failed:', signInError);
            // Show success for email verification but tell user to sign in manually
            showSuccess('Email verified! Please sign in to continue.');
            // Redirect to sign-in screen after 1.5 seconds
            setTimeout(() => {
              router.replace('/(auth)/signin');
            }, 1500);
          }
        } else {
          // No password was passed (user came from direct link or password wasn't saved)
          // Show success message
          showSuccess('Email verified! Please sign in to continue.');
          // Redirect to sign-in screen
          setTimeout(() => {
            router.replace('/(auth)/signin');
          }, 1500);
        }
      }
    } catch (error: any) {
      // Log any errors that occurred during confirmation
      console.error('Confirmation error:', error);
      
      // Handle specific error cases with user-friendly messages
      // Check if error indicates user is already confirmed
      if (error.message?.includes('already confirmed') || 
          error.message?.includes('CONFIRMED')) {
        // Same handling as above - different UI for web vs mobile
        if (Platform.OS === 'web') {
          showSuccess('Email already verified! Redirecting to sign in...');
          setTimeout(() => {
            router.replace('/(auth)/signin');
          }, 1000);
        } else {
          Alert.alert('Already Verified', 'Your email is already verified. You can sign in now!', [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/signin')
            }
          ]);
        }
      } else if (error.message?.includes('Invalid code') || 
                 error.message?.includes('Code mismatch') ||
                 error.message?.includes('CodeMismatchException')) {
        // User entered wrong code - show specific error message
        showError('The code you entered is incorrect. Please check your email and try again.');
      } else if (error.message?.includes('ExpiredCode')) {
        // Code has expired - tell user to request a new one
        showError('The verification code has expired. Click "Resend" to get a new code.');
      } else {
        // Generic error - show the error message or a default message
        showError(error.message || 'Invalid code. Please try again.');
      }
    } finally {
      // Always reset loading state, even if there was an error
      setIsLoading(false);
    }
  };

  // Async function to resend the verification code if user didn't receive it
  const handleResendCode = async () => {
    // Set resending state to true to show loading and disable button
    setIsResending(true);
    try {
      // Call AWS Cognito to resend the verification code to the user's email
      await resendSignUpCode(email as string);
      // Show success message to user
      showSuccess('A new verification code has been sent to your email!');
    } catch (error: any) {
      // If resend fails, show error message
      showError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      // Always reset resending state
      setIsResending(false);
    }
  };

  // Return the JSX UI for the confirmation screen
  return (
    // Main container view - takes full screen, white background
    <View style={styles.container}>
      {/* Content container - centered content with padding */}
      <View style={styles.content}>
        {/* Large emoji icon for visual appeal */}
        <Text style={styles.emoji}>📧</Text>
        {/* Main title text */}
        <Text style={styles.title}>Check Your Email</Text>
        {/* Subtitle with email address displayed */}
        <Text style={styles.subtitle}>
          We&apos;ve sent a verification code to {'\n'}
          {/* Email address displayed in bold blue color */}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/* Form container for input and buttons */}
        <View style={styles.form}>
          {/* Text input for entering the 6-digit verification code */}
          <TextInput
            style={styles.input}
            // Controlled input - value is bound to code state
            value={code}
            // Update code state when user types
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            // Show numeric keypad on mobile
            keyboardType="number-pad"
            // Limit input to 6 characters
            maxLength={6}
            // Center-align the text
            textAlign="center"
          />

          {/* Button to submit and verify the code */}
          <TouchableOpacity
            // Apply button styles, and disabled style if loading
            style={[styles.button, isLoading && styles.buttonDisabled]}
            // Call handleConfirm when pressed
            onPress={handleConfirm}
            // Disable button while loading to prevent double-submission
            disabled={isLoading}
          >
            {/* Button text changes based on loading state */}
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          {/* Link button to resend the verification code */}
          <TouchableOpacity 
            style={styles.linkButton} 
            // Call handleResendCode when pressed
            onPress={handleResendCode}
            // Disable while resending to prevent spam
            disabled={isResending}
          >
            {/* Link text with dynamic resend button text */}
            <Text style={styles.linkText}>
              Didn&apos;t receive code? <Text style={styles.linkTextBold}>
                {/* Show "Sending..." while resending, otherwise "Resend" */}
                {isResending ? 'Sending...' : 'Resend'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// StyleSheet object containing all the visual styles for this component
const styles = StyleSheet.create({
  // Main container style - takes full screen height, white background
  container: {
    flex: 1, // Take up all available vertical space
    backgroundColor: '#fff', // White background color
  },
  // Content wrapper - centers content vertically and horizontally
  content: {
    flex: 1, // Take full height
    padding: 30, // 30px padding on all sides
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  // Large emoji icon style
  emoji: {
    fontSize: 80, // Very large font size for emoji
    marginBottom: 20, // Space below emoji
  },
  // Main title text style
  title: {
    fontSize: 28, // Large font size
    fontWeight: 'bold', // Bold text
    color: '#333', // Dark gray color
    marginBottom: 10, // Small space below title
    textAlign: 'center', // Center-align text
  },
  // Subtitle text style (instructions)
  subtitle: {
    fontSize: 16, // Medium font size
    color: '#666', // Medium gray color
    textAlign: 'center', // Center-align text
    marginBottom: 40, // Large space below subtitle
  },
  // Email address text style (highlighted in blue)
  email: {
    fontWeight: 'bold', // Bold text
    color: '#4A90E2', // Blue color to highlight email
  },
  // Form container style
  form: {
    width: '100%', // Take full width of parent
    gap: 20, // 20px spacing between form elements
  },
  // Text input style for verification code
  input: {
    borderWidth: 1, // 1px border
    borderColor: '#ddd', // Light gray border
    borderRadius: 12, // Rounded corners
    padding: 20, // Internal padding
    fontSize: 24, // Large font for code visibility
    fontWeight: 'bold', // Bold text
    letterSpacing: 10, // Space between characters (makes code easier to read)
    backgroundColor: '#f9f9f9', // Light gray background
  },
  // Primary button style (Verify Email button)
  button: {
    backgroundColor: '#4A90E2', // Blue background
    padding: 18, // Internal padding
    borderRadius: 12, // Rounded corners
    alignItems: 'center', // Center button text
  },
  // Disabled button style (when loading)
  buttonDisabled: {
    opacity: 0.6, // Reduce opacity to show disabled state
  },
  // Button text style
  buttonText: {
    color: '#fff', // White text
    fontSize: 18, // Medium font size
    fontWeight: 'bold', // Bold text
  },
  // Link button container (Resend code)
  linkButton: {
    alignItems: 'center', // Center the link text
  },
  // Link text style
  linkText: {
    fontSize: 14, // Small font size
    color: '#666', // Medium gray color
  },
  // Bold part of link text (the "Resend" word)
  linkTextBold: {
    color: '#4A90E2', // Blue color to make it clickable-looking
    fontWeight: 'bold', // Bold text
  },
});

