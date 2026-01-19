import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const AGE_GROUPS = [
  { value: 'child', label: 'Child (6-12)', emoji: '👶' },
  { value: 'teen', label: 'Teen (13-17)', emoji: '🧒' },
  { value: 'young_adult', label: 'Young Adult (18-25)', emoji: '👨' },
  { value: 'adult', label: 'Adult (26-45)', emoji: '👔' },
  { value: 'senior', label: 'Senior (45+)', emoji: '👴' },
];

const CONTEXTS = [
  { value: 'school', label: 'School', emoji: '🏫' },
  { value: 'college', label: 'College', emoji: '🎓' },
  { value: 'corporate', label: 'Corporate', emoji: '💼' },
  { value: 'business', label: 'Business', emoji: '📈' },
  { value: 'exam_prep', label: 'Exam Prep', emoji: '📝' },
  { value: 'general', label: 'Daily Life', emoji: '🌟' },
];

const EXAM_PREPS = [
  { value: 'none', label: 'None', emoji: '🚫' },
  { value: 'gre', label: 'GRE', emoji: '📚' },
  { value: 'sat', label: 'SAT', emoji: '✏️' },
  { value: 'toefl', label: 'TOEFL', emoji: '🌍' },
  { value: 'ielts', label: 'IELTS', emoji: '🎯' },
  { value: 'act', label: 'ACT', emoji: '📖' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [ageGroup, setAgeGroup] = useState('');
  const [context, setContext] = useState('');
  const [examPrep, setExamPrep] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step === 1 && ageGroup) {
      setStep(2);
    } else if (step === 2 && context) {
      setStep(3);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Request notification permissions (skip on web)
      let expoPushToken = null;
      
      if (Platform.OS !== 'web') {
        try {
          const { status } = await Notifications.requestPermissionsAsync();
          if (status === 'granted') {
            const token = await Notifications.getExpoPushTokenAsync();
            expoPushToken = token.data;
          }
        } catch (notifError) {
          console.log('Could not setup notifications:', notifError);
          // Continue without notifications
        }
      }

      // Create user profile
      const profileData: any = {
        ageGroup,
        context,
        expoPushToken,
        notificationPreferences: {
          dailyWord: {
            enabled: true,
            channels: Platform.OS === 'web' ? [] : ['push'],
            time: '08:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      };
      
      // Add examPrep if provided (and not "none")
      if (examPrep && examPrep !== 'none') {
        profileData.examPrep = examPrep;
      }
      
      // Add user info from auth context if available
      if (user?.email) {
        profileData.email = user.email;
      }
      if (user?.name) {
        profileData.name = user.name;  // Use display name from Cognito
        profileData.username = user.name;  // Set username same as name
      } else if (user?.username) {
        profileData.username = user.username;
      }
      
      console.log('Saving profile with data:', profileData);
      
      await api.updateUserProfile(profileData);

      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 1) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What&apos;s your age group?</Text>
          <Text style={styles.subtitle}>This helps us personalize your learning experience</Text>
        </View>

        <ScrollView contentContainerStyle={styles.options}>
          {AGE_GROUPS.map((group) => (
            <TouchableOpacity
              key={group.value}
              style={[
                styles.option,
                ageGroup === group.value && styles.optionSelected,
              ]}
              onPress={() => setAgeGroup(group.value)}
            >
              <Text style={styles.optionEmoji}>{group.emoji}</Text>
              <Text style={styles.optionLabel}>{group.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, !ageGroup && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!ageGroup}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 2) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>What&apos;s your primary context?</Text>
          <Text style={styles.subtitle}>Where will you use these words?</Text>
        </View>

        <ScrollView contentContainerStyle={styles.options}>
          {CONTEXTS.map((ctx) => (
            <TouchableOpacity
              key={ctx.value}
              style={[
                styles.option,
                context === ctx.value && styles.optionSelected,
              ]}
              onPress={() => setContext(ctx.value)}
            >
              <Text style={styles.optionEmoji}>{ctx.emoji}</Text>
              <Text style={styles.optionLabel}>{ctx.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={[styles.button, !context && styles.buttonDisabled]}
          onPress={handleNext}
          disabled={!context}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Step 3: Exam Prep (Optional)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Preparing for an exam?</Text>
        <Text style={styles.subtitle}>We can tailor words for your test, or choose None</Text>
      </View>

      <ScrollView contentContainerStyle={styles.options}>
        {EXAM_PREPS.map((exam) => (
          <TouchableOpacity
            key={exam.value}
            style={[
              styles.option,
              examPrep === exam.value && styles.optionSelected,
            ]}
            onPress={() => setExamPrep(exam.value)}
          >
            <Text style={styles.optionEmoji}>{exam.emoji}</Text>
            <Text style={styles.optionLabel}>{exam.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleSkip}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, styles.buttonSecondaryText]}>
            Skip
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, (!examPrep || isLoading) && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!examPrep || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Setting up...' : 'Get Started'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 30,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  options: {
    gap: 15,
    paddingBottom: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  optionSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E6F4FE',
  },
  optionEmoji: {
    fontSize: 32,
    marginRight: 15,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  button: {
    flex: 1,
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonSecondaryText: {
    color: '#4A90E2',
  },
});

