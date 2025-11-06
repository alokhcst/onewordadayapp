import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { api } from '@/lib/api';
import * as Notifications from 'expo-notifications';

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

export default function OnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [step, setStep] = useState(1);
  const [ageGroup, setAgeGroup] = useState((params.ageGroup as string) || '');
  const [context, setContext] = useState((params.context as string) || '');
  const [examPrep, setExamPrep] = useState((params.examPrep as string) || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!ageGroup || !context) {
      Alert.alert('Error', 'Please complete all selections');
      return;
    }

    setIsLoading(true);
    try {
      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      let expoPushToken = null;

      if (status === 'granted') {
        const token = await Notifications.getExpoPushTokenAsync();
        expoPushToken = token.data;
      }

      // Create user profile
      const profileData: any = {
        ageGroup,
        context,
        expoPushToken,
        notificationPreferences: {
          dailyWord: {
            enabled: true,
            channels: ['push'],
            time: '08:00',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      };
      
      // Add examPrep if provided
      if (examPrep) {
        profileData.examPrep = examPrep;
      }
      
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
          <Text style={styles.title}>What's your age group?</Text>
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
          onPress={() => setStep(2)}
          disabled={!ageGroup}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>What's your primary context?</Text>
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
        style={[styles.button, (!context || isLoading) && styles.buttonDisabled]}
        onPress={handleComplete}
        disabled={!context || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Setting up...' : 'Get Started'}
        </Text>
      </TouchableOpacity>
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
  button: {
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

