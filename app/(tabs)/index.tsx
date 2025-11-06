import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TodayScreen() {
  const router = useRouter();
  const { showSuccess, showError, confirm } = useToast();
  const [word, setWord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    loadTodaysWord();
  }, []);

  const loadTodaysWord = async () => {
    try {
      const response = await api.getTodaysWord();
      setWord(response.word);
    } catch (error: any) {
      console.error('Error loading word:', error);
      if (error.response?.status === 404) {
        Alert.alert('No Word Yet', 'Your daily word will be generated soon. Check back later!');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!word) return;

    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    } else {
      setIsSpeaking(true);
      Speech.speak(word.word, {
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    }
  };

  const handleFeedback = () => {
    if (word) {
      router.push({
        pathname: '/feedback',
        params: { wordId: word.wordId, date: word.date },
      });
    }
  };

  const handleNextWord = async () => {
    const confirmed = await confirm('Skip this word and get a new one?');

    if (!confirmed) return;

    try {
      setIsLoading(true);
      // Mark current word as skipped
      await api.submitFeedback({
        wordId: word.wordId,
        date: word.date,
        rating: 0,
        practiced: false,
        encountered: false,
        difficulty: undefined,
        comments: 'Skipped to next word',
      });
      
      // Reload word - this should trigger new word generation
      await loadTodaysWord();
      showSuccess('New word loaded!');
    } catch (error: any) {
      console.error('Error getting next word:', error);
      showError('Failed to get new word. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  if (!word) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📚</Text>
        <Text style={styles.emptyTitle}>No Word Available</Text>
        <Text style={styles.emptyText}>Your daily word will appear here</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTodaysWord}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>
          {new Date(word.date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.wordHeader}>
          <View>
            <Text style={styles.word}>{word.word}</Text>
            <Text style={styles.syllables}>{word.syllables}</Text>
            <Text style={styles.partOfSpeech}>{word.partOfSpeech}</Text>
          </View>
          <TouchableOpacity style={styles.speakButton} onPress={handleSpeak}>
            <Ionicons
              name={isSpeaking ? 'stop-circle' : 'volume-high'}
              size={32}
              color="#4A90E2"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.pronunciation}>{word.pronunciation}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Definition</Text>
          <Text style={styles.definition}>{word.definition}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Example Sentences</Text>
          {word.sentences?.map((sentence: string, index: number) => (
            <View key={index} style={styles.sentenceItem}>
              <Text style={styles.sentenceNumber}>{index + 1}.</Text>
              <Text style={styles.sentence}>{sentence}</Text>
            </View>
          ))}
        </View>

        {word.synonyms && word.synonyms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synonyms</Text>
            <View style={styles.tagsContainer}>
              {word.synonyms.map((synonym: string, index: number) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{synonym}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {word.antonyms && word.antonyms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Antonyms</Text>
            <View style={styles.tagsContainer}>
              {word.antonyms.map((antonym: string, index: number) => (
                <View key={index} style={[styles.tag, styles.antonymTag]}>
                  <Text style={[styles.tagText, styles.antonymTagText]}>{antonym}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.feedbackButton} onPress={handleFeedback}>
          <Ionicons name="chatbox-ellipses" size={20} color="#fff" />
          <Text style={styles.feedbackButtonText}>Share Feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextWordButton} onPress={handleNextWord}>
          <Ionicons name="arrow-forward-circle" size={20} color="#4A90E2" />
          <Text style={styles.nextWordButtonText}>Next Word</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 30,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#4A90E2',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  date: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    padding: 25,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  word: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#333',
  },
  syllables: {
    fontSize: 18,
    color: '#4A90E2',
    marginTop: 5,
  },
  partOfSpeech: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  speakButton: {
    padding: 10,
  },
  pronunciation: {
    fontSize: 18,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  section: {
    marginTop: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  definition: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  sentenceItem: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  sentenceNumber: {
    fontSize: 16,
    color: '#4A90E2',
    marginRight: 8,
    fontWeight: 'bold',
  },
  sentence: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tag: {
    backgroundColor: '#E6F4FE',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tagText: {
    color: '#4A90E2',
    fontSize: 14,
    fontWeight: '600',
  },
  antonymTag: {
    backgroundColor: '#FFE6E6',
  },
  antonymTagText: {
    color: '#E24A4A',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    margin: 20,
    marginTop: 10,
  },
  feedbackButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  feedbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextWordButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 12,
    gap: 10,
    borderWidth: 2,
    borderColor: '#4A90E2',
  },
  nextWordButtonText: {
    color: '#4A90E2',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
