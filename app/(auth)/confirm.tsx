import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, password } = params;
  const { confirmSignUp, resendSignUpCode, signIn } = useAuth();
  const { showSuccess, showError } = useToast();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleConfirm = async () => {
    if (!code || code.length !== 6) {
      showError('Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Confirming signup for:', email);
      const result = await confirmSignUp(email as string, code);
      console.log('Confirmation result:', result);
      
      // Check if user was already confirmed
      if (result?.alreadyConfirmed) {
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
      } else {
        // Success - sign in the user automatically if we have password
        if (password) {
          console.log('Auto-signing in user after confirmation...');
          try {
            await signIn(email as string, password as string);
            console.log('User signed in successfully');
            
            showSuccess('Email verified! Completing setup...');
            
            // Navigate to onboarding - user is now authenticated and will fill profile there
            setTimeout(() => {
              router.replace('/(auth)/onboarding');
            }, 500);
          } catch (signInError) {
            console.error('Auto sign-in failed:', signInError);
            // If auto sign-in fails, redirect to sign-in page
            showSuccess('Email verified! Please sign in to continue.');
            setTimeout(() => {
              router.replace('/(auth)/signin');
            }, 1500);
          }
        } else {
          // No password - redirect to sign in
          showSuccess('Email verified! Please sign in to continue.');
          setTimeout(() => {
            router.replace('/(auth)/signin');
          }, 1500);
        }
      }
    } catch (error: any) {
      console.error('Confirmation error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('already confirmed') || 
          error.message?.includes('CONFIRMED')) {
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
        showError('The code you entered is incorrect. Please check your email and try again.');
      } else if (error.message?.includes('ExpiredCode')) {
        showError('The verification code has expired. Click "Resend" to get a new code.');
      } else {
        showError(error.message || 'Invalid code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    try {
      await resendSignUpCode(email as string);
      showSuccess('A new verification code has been sent to your email!');
    } catch (error: any) {
      showError(error.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>📧</Text>
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification code to {'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={setCode}
            placeholder="Enter 6-digit code"
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
          />

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleConfirm}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton} 
            onPress={handleResendCode}
            disabled={isResending}
          >
            <Text style={styles.linkText}>
              Didn't receive code? <Text style={styles.linkTextBold}>
                {isResending ? 'Sending...' : 'Resend'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  email: {
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  form: {
    width: '100%',
    gap: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 20,
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 10,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#666',
  },
  linkTextBold: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});

