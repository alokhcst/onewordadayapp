import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { email, ageGroup, context, examPrep } = params;
  const { confirmSignUp } = useAuth();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await confirmSignUp(email as string, code);
      Alert.alert('Success', 'Your email has been verified!', [
        { 
          text: 'OK', 
          onPress: () => router.replace({
            pathname: '/(auth)/onboarding',
            params: {
              ageGroup: ageGroup || '',
              context: context || '',
              examPrep: examPrep || '',
            },
          })
        }
      ]);
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid code');
    } finally {
      setIsLoading(false);
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

          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Didn't receive code? <Text style={styles.linkTextBold}>Resend</Text></Text>
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

