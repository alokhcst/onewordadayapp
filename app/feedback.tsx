import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const RATINGS = [1, 2, 3, 4, 5];
const DIFFICULTIES = [
  { value: 'too_easy', label: 'Too Easy', emoji: '😴' },
  { value: 'appropriate', label: 'Just Right', emoji: '😊' },
  { value: 'too_difficult', label: 'Too Hard', emoji: '😰' },
];

export default function FeedbackScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { wordId, date } = useLocalSearchParams<{ wordId: string; date: string }>();
  const [rating, setRating] = useState(0);
  const [practiced, setPracticed] = useState(false);
  const [encountered, setEncountered] = useState(false);
  const [difficulty, setDifficulty] = useState('appropriate');
  const [additionalContext, setAdditionalContext] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    console.log('Submit feedback clicked', { rating, wordId, date });
    
    if (rating === 0) {
      showError('Please rate today\'s word');
      return;
    }

    setIsSubmitting(true);
    console.log('Submitting feedback...');
    
    try {
      const result = await api.submitFeedback({
        wordId,
        date,
        rating,
        practiced,
        encountered,
        difficulty,
        additionalContext,
        comments,
      });
      
      console.log('Feedback submitted successfully:', result);
      showSuccess('Thank you! Your feedback helps us personalize your learning experience.');
      setTimeout(() => router.back(), 1500);
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      console.error('Error details:', error.response?.data || error.message);
      showError('Failed to submit feedback. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      console.log('Submit complete');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Share Feedback',
          headerBackTitle: 'Back',
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How would you rate today's word?</Text>
          <View style={styles.ratingContainer}>
            {RATINGS.map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Ionicons
                  name={star <= rating ? 'star' : 'star-outline'}
                  size={40}
                  color="#FFB800"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Did you practice using this word?</Text>
          <TouchableOpacity
            style={[styles.checkboxRow, practiced && styles.checkboxRowSelected]}
            onPress={() => setPracticed(!practiced)}
          >
            <View style={[styles.checkbox, practiced && styles.checkboxSelected]}>
              {practiced && <Ionicons name="checkmark" size={20} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Yes, I used this word today</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.checkboxRow, encountered && styles.checkboxRowSelected]}
            onPress={() => setEncountered(!encountered)}
          >
            <View style={[styles.checkbox, encountered && styles.checkboxSelected]}>
              {encountered && <Ionicons name="checkmark" size={20} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>I encountered this word naturally</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How did you find the difficulty?</Text>
          <View style={styles.difficultyContainer}>
            {DIFFICULTIES.map((diff) => (
              <TouchableOpacity
                key={diff.value}
                style={[
                  styles.difficultyButton,
                  difficulty === diff.value && styles.difficultyButtonSelected,
                ]}
                onPress={() => setDifficulty(diff.value)}
              >
                <Text style={styles.difficultyEmoji}>{diff.emoji}</Text>
                <Text style={styles.difficultyLabel}>{diff.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Additional context for tomorrow (optional)
          </Text>
          <TextInput
            style={styles.textInput}
            value={additionalContext}
            onChangeText={setAdditionalContext}
            placeholder="E.g., I have a presentation, I'm reading about science..."
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Any other comments? (optional)</Text>
          <TextInput
            style={styles.textInput}
            value={comments}
            onChangeText={setComments}
            placeholder="Share your thoughts..."
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (isSubmitting || rating === 0) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting || rating === 0}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  starButton: {
    padding: 5,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  checkboxRowSelected: {
    backgroundColor: '#E6F4FE',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  difficultyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  difficultyButtonSelected: {
    borderColor: '#4A90E2',
    backgroundColor: '#E6F4FE',
  },
  difficultyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  difficultyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

