import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import { getMembershipBadge } from '@/lib/points';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type FilterType = 'all' | 'practiced' | 'viewed' | 'skipped';

export default function HistoryScreen() {
  const { showSuccess, showError } = useToast();
  const [allWords, setAllWords] = useState<any[]>([]);
  const [filteredWords, setFilteredWords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedWordId, setExpandedWordId] = useState<string | null>(null);
  const [feedbackData, setFeedbackData] = useState<{[key: string]: any}>({});

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilter();
  }, [activeFilter, allWords]);

  const loadHistory = async () => {
    try {
      const response = await api.getWordHistory({ limit: 100 }); // Load more words
      setAllWords(response.words || []);
      setStats(response.stats || {});
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...allWords];
    
    switch (activeFilter) {
      case 'practiced':
        filtered = allWords.filter(w => w.practiceStatus === 'practiced' || w.practiced === true);
        break;
      case 'viewed':
        filtered = allWords.filter(w => w.practiceStatus !== 'practiced' && w.practiceStatus !== 'skipped');
        break;
      case 'skipped':
        filtered = allWords.filter(w => w.practiceStatus === 'skipped');
        break;
      default:
        filtered = allWords;
    }
    
    setFilteredWords(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }

    try {
      const response = await api.getWordHistory({ search: searchQuery, limit: 100 });
      setAllWords(response.words || []);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const toggleFeedback = (wordKey: string) => {
    setExpandedWordId(expandedWordId === wordKey ? null : wordKey);
  };

  const initializeFeedback = (item: any) => {
    const key = `${item.date}-${item.word}`;
    if (!feedbackData[key]) {
      setFeedbackData({
        ...feedbackData,
        [key]: {
          rating: item.rating || 0,
          practiced: item.practiced || false,
          encountered: item.encountered || false,
          difficulty: item.difficulty || 'appropriate',
          comments: item.comments || '',
        }
      });
    }
  };

  const updateFeedbackField = (wordKey: string, field: string, value: any) => {
    setFeedbackData({
      ...feedbackData,
      [wordKey]: {
        ...(feedbackData[wordKey] || {}),
        [field]: value,
      }
    });
  };

  const handleSubmitFeedback = async (item: any) => {
    const wordKey = `${item.date}-${item.word}`;
    const feedback = feedbackData[wordKey];
    
    if (!feedback || !feedback.rating) {
      showError('Please provide a rating before submitting');
      return;
    }

    try {
      const result = await api.submitFeedback({
        wordId: item.wordId || item.word,
        date: item.date,
        rating: feedback.rating,
        practiced: feedback.practiced,
        encountered: feedback.encountered,
        difficulty: feedback.difficulty,
        comments: feedback.comments,
      });

      const reward = result?.reward;
      if (reward?.pointsAdded) {
        showSuccess(`Feedback saved! +${reward.pointsAdded} points`);
      } else {
        showSuccess('Feedback saved!');
      }
      if (reward?.levelChanged) {
        const badge = getMembershipBadge(reward.newLevel);
        showSuccess(`Congratulations! You're now a ${badge.label}.`);
      }
      
      // Update the word in the list
      const updatedWords = allWords.map(w => 
        w.date === item.date && w.word === item.word 
          ? { ...w, ...feedback, practiceStatus: feedback.practiced ? 'practiced' : w.practiceStatus }
          : w
      );
      setAllWords(updatedWords);
      
      // Collapse feedback section
      setExpandedWordId(null);
      
      // Reload to get updated stats
      loadHistory();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      showError('Failed to save feedback. Please try again.');
    }
  };

  const renderWordItem = ({ item }: { item: any }) => {
    const isPracticed = item.practiceStatus === 'practiced' || item.practiced === true;
    const isSkipped = item.practiceStatus === 'skipped';
    const isViewed = !isPracticed && !isSkipped;
    const wordKey = `${item.date}-${item.word}`;
    const isExpanded = expandedWordId === wordKey;
    const currentFeedback = feedbackData[wordKey] || {
      rating: item.rating || 0,
      practiced: item.practiced || false,
      encountered: item.encountered || false,
      difficulty: item.difficulty || 'appropriate',
      comments: item.comments || '',
    };
    
    return (
      <View style={[
        styles.wordCard,
        isPracticed && styles.wordCardPracticed,
        isSkipped && styles.wordCardSkipped,
      ]}>
        <TouchableOpacity 
          onPress={() => {
            toggleFeedback(wordKey);
            if (!feedbackData[wordKey]) {
              initializeFeedback(item);
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.wordHeader}>
            <View style={styles.wordInfo}>
              <View style={styles.wordTitleRow}>
                <Text style={styles.wordText}>{item.word}</Text>
                {isPracticed && (
                  <View style={styles.practicedBadge}>
                    <Ionicons name="checkmark-circle" size={20} color="#50C878" />
                    <Text style={styles.practicedText}>Practiced</Text>
                  </View>
                )}
                {isSkipped && (
                  <View style={styles.skippedBadge}>
                    <Ionicons name="close-circle" size={20} color="#E24A4A" />
                    <Text style={styles.skippedText}>Skipped</Text>
                  </View>
                )}
              </View>
              <Text style={styles.wordDate}>
                {new Date(item.date).toLocaleDateString('en-US', { 
                  weekday: 'short',
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </Text>
              {item.rating && item.rating > 0 && (
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, index) => (
                    <Ionicons
                      key={index}
                      name={index < item.rating ? 'star' : 'star-outline'}
                      size={16}
                      color="#FFB800"
                    />
                  ))}
                  <Text style={styles.ratingText}>{item.rating}/5</Text>
                </View>
              )}
            </View>
            <View style={styles.statusBadgeContainer}>
              <View style={[
                styles.statusBadge,
                isPracticed && styles.statusPracticed,
                isSkipped && styles.statusSkipped,
              ]}>
                <Text style={styles.statusText}>
                  {isPracticed ? '✓' : isSkipped ? '✗' : '👁️'}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? 'chevron-up' : 'chevron-down'} 
                size={20} 
                color="#666" 
                style={styles.expandIcon}
              />
            </View>
          </View>
          <Text style={styles.wordDefinition} numberOfLines={isExpanded ? undefined : 2}>
            {item.definition}
          </Text>
          {item.comments && !isExpanded && (
            <Text style={styles.wordComments} numberOfLines={1}>
              💬 {item.comments}
            </Text>
          )}
        </TouchableOpacity>

        {/* Expandable Feedback Section */}
        {isExpanded && (
          <View style={styles.feedbackSection}>
            <View style={styles.feedbackDivider} />
            
            {/* Rating */}
            <View style={styles.feedbackItem}>
              <Text style={styles.feedbackLabel}>How well do you know this word?</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => updateFeedbackField(wordKey, 'rating', star)}
                  >
                    <Ionicons
                      name={star <= currentFeedback.rating ? 'star' : 'star-outline'}
                      size={32}
                      color="#FFB800"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Practice Toggle */}
            <View style={styles.feedbackItem}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => updateFeedbackField(wordKey, 'practiced', !currentFeedback.practiced)}
              >
                <Ionicons
                  name={currentFeedback.practiced ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={currentFeedback.practiced ? '#50C878' : '#999'}
                />
                <Text style={styles.toggleLabel}>I practiced using this word today</Text>
              </TouchableOpacity>
            </View>

            {/* Encountered Toggle */}
            <View style={styles.feedbackItem}>
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => updateFeedbackField(wordKey, 'encountered', !currentFeedback.encountered)}
              >
                <Ionicons
                  name={currentFeedback.encountered ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={currentFeedback.encountered ? '#4A90E2' : '#999'}
                />
                <Text style={styles.toggleLabel}>I encountered this word in real life</Text>
              </TouchableOpacity>
            </View>

            {/* Difficulty */}
            <View style={styles.feedbackItem}>
              <Text style={styles.feedbackLabel}>Difficulty Level</Text>
              <View style={styles.difficultyButtons}>
                {[
                  { value: 'too_easy', label: 'Too Easy', emoji: '😊' },
                  { value: 'appropriate', label: 'Just Right', emoji: '👌' },
                  { value: 'too_difficult', label: 'Too Hard', emoji: '😰' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.difficultyButton,
                      currentFeedback.difficulty === option.value && styles.difficultyButtonActive,
                    ]}
                    onPress={() => updateFeedbackField(wordKey, 'difficulty', option.value)}
                  >
                    <Text style={styles.difficultyEmoji}>{option.emoji}</Text>
                    <Text style={[
                      styles.difficultyLabel,
                      currentFeedback.difficulty === option.value && styles.difficultyLabelActive,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Comments */}
            <View style={styles.feedbackItem}>
              <Text style={styles.feedbackLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.commentsInput}
                value={currentFeedback.comments}
                onChangeText={(text) => updateFeedbackField(wordKey, 'comments', text)}
                placeholder="Add your thoughts about this word..."
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleSubmitFeedback(item)}
            >
              <Text style={styles.submitButtonText}>Save Feedback</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Word History</Text>
        
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalWords}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#50C878' }]}>{stats.practicedWords}</Text>
              <Text style={styles.statLabel}>Practiced</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: '#E24A4A' }]}>{stats.skippedWords}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>
          </View>
        )}

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterButtonText, activeFilter === 'all' && styles.filterButtonTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'practiced' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('practiced')}
          >
            <Ionicons name="checkmark-circle" size={16} color={activeFilter === 'practiced' ? '#fff' : '#50C878'} />
            <Text style={[styles.filterButtonText, activeFilter === 'practiced' && styles.filterButtonTextActive]}>
              Practiced
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'viewed' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('viewed')}
          >
            <Ionicons name="eye" size={16} color={activeFilter === 'viewed' ? '#fff' : '#4A90E2'} />
            <Text style={[styles.filterButtonText, activeFilter === 'viewed' && styles.filterButtonTextActive]}>
              Viewed
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.filterButton, activeFilter === 'skipped' && styles.filterButtonActive]}
            onPress={() => setActiveFilter('skipped')}
          >
            <Ionicons name="close-circle" size={16} color={activeFilter === 'skipped' ? '#fff' : '#E24A4A'} />
            <Text style={[styles.filterButtonText, activeFilter === 'skipped' && styles.filterButtonTextActive]}>
              Skipped
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search words..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      <FlatList
        data={filteredWords}
        renderItem={renderWordItem}
        keyExtractor={(item) => `${item.userId}-${item.date}-${item.wordId || item.word}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all' ? 'No words yet' : 
               activeFilter === 'practiced' ? 'No practiced words yet' :
               activeFilter === 'skipped' ? 'No skipped words' :
               'No viewed words'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all' ? 'Words will appear here as you learn' : 
               activeFilter === 'practiced' ? 'Practice words to see them here' :
               'Complete your daily word to build your history'}
            </Text>
          </View>
        }
      />
    </View>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 15,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 15,
    paddingBottom: 100,
  },
  wordCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#f5f5f5',
  },
  wordCardPracticed: {
    borderLeftColor: '#50C878',
    backgroundColor: '#FAFFFE',
  },
  wordCardSkipped: {
    borderLeftColor: '#E24A4A',
    backgroundColor: '#FFFAFA',
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  wordInfo: {
    flex: 1,
  },
  wordTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  wordText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  practicedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8EF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  practicedText: {
    fontSize: 12,
    color: '#50C878',
    fontWeight: '600',
  },
  skippedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE6E6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skippedText: {
    fontSize: 12,
    color: '#E24A4A',
    fontWeight: '600',
  },
  wordDate: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 3,
  },
  ratingText: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '600',
    marginLeft: 4,
  },
  statusBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusPracticed: {
    backgroundColor: '#E6F8EF',
  },
  statusSkipped: {
    backgroundColor: '#FFE6E6',
  },
  statusText: {
    fontSize: 18,
  },
  wordDefinition: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  wordComments: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  statusBadgeContainer: {
    alignItems: 'center',
    gap: 4,
  },
  expandIcon: {
    marginTop: 4,
  },
  feedbackSection: {
    marginTop: 15,
    paddingTop: 15,
  },
  feedbackDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 15,
  },
  feedbackItem: {
    marginBottom: 20,
  },
  feedbackLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  difficultyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  difficultyButtonActive: {
    borderColor: '#4A90E2',
    backgroundColor: '#E6F4FE',
  },
  difficultyEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  difficultyLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  difficultyLabelActive: {
    color: '#4A90E2',
  },
  commentsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#f9f9f9',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

