import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const { showError } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [context, setContext] = useState('');
  const [examPrep, setExamPrep] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      showError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      showError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp(email, password, name);
      
      if (!result.isSignUpComplete) {
        // Navigate to confirmation screen with learning profile data
        router.push({
          pathname: '/(auth)/confirm',
          params: { 
            email,
            ageGroup,
            context,
            examPrep,
          },
        });
      } else {
        // Navigate to onboarding with learning profile data
        router.replace({
          pathname: '/(auth)/onboarding',
          params: {
            ageGroup,
            context,
            examPrep,
          },
        });
      }
    } catch (error: any) {
      showError(error.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your vocabulary journey today</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>Learning Profile (Optional)</Text>
            <Text style={styles.sectionSubtitle}>Help us personalize your experience</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age Group</Text>
            <View style={styles.pickerContainer}>
              <select
                style={styles.select as any}
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
              >
                <option value="">Select your age group</option>
                <option value="school">School (6-18)</option>
                <option value="college">College (18-24)</option>
                <option value="adult">Adult (25+)</option>
              </select>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Learning Context</Text>
            <View style={styles.pickerContainer}>
              <select
                style={styles.select as any}
                value={context}
                onChange={(e) => setContext(e.target.value)}
              >
                <option value="">Select context</option>
                <option value="academic">Academic</option>
                <option value="professional">Professional</option>
                <option value="personal">Personal Development</option>
              </select>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Exam Preparation (Optional)</Text>
            <View style={styles.pickerContainer}>
              <select
                style={styles.select as any}
                value={examPrep}
                onChange={(e) => setExamPrep(e.target.value)}
              >
                <option value="">None</option>
                <option value="gre">GRE</option>
                <option value="sat">SAT</option>
                <option value="toefl">TOEFL</option>
                <option value="ielts">IELTS</option>
              </select>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/(auth)/signin')}
          >
            <Text style={styles.linkText}>
              Already have an account? <Text style={styles.linkTextBold}>Sign In</Text>
            </Text>
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
  sectionDivider: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  select: {
    width: '100%',
    padding: 15,
    fontSize: 16,
    border: 'none',
    outline: 'none',
    backgroundColor: '#f9f9f9',
    cursor: 'pointer',
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
  linkButton: {
    alignItems: 'center',
    marginTop: 10,
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

