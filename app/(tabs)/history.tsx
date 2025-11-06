import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';

export default function HistoryScreen() {
  const [words, setWords] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.getWordHistory({ limit: 30 });
      setWords(response.words || []);
      setStats(response.stats || {});
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadHistory();
      return;
    }

    try {
      const response = await api.getWordHistory({ search: searchQuery, limit: 30 });
      setWords(response.words || []);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const renderWordItem = ({ item }: { item: any }) => (
    <View style={styles.wordCard}>
      <View style={styles.wordHeader}>
        <View style={styles.wordInfo}>
          <Text style={styles.wordText}>{item.word}</Text>
          <Text style={styles.wordDate}>
            {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
          {item.rating && item.rating > 0 && (
            <View style={styles.ratingContainer}>
              {[...Array(5)].map((_, index) => (
                <Ionicons
                  key={index}
                  name={index < item.rating ? 'star' : 'star-outline'}
                  size={14}
                  color="#FFB800"
                />
              ))}
            </View>
          )}
        </View>
        <View style={[
          styles.statusBadge,
          item.practiceStatus === 'practiced' && styles.statusPracticed,
          item.practiceStatus === 'skipped' && styles.statusSkipped,
        ]}>
          <Text style={styles.statusText}>
            {item.practiceStatus === 'practiced' ? '✓' : item.practiceStatus === 'skipped' ? '✗' : '⏳'}
          </Text>
        </View>
      </View>
      <Text style={styles.wordDefinition} numberOfLines={2}>
        {item.definition}
      </Text>
    </View>
  );

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
        data={words}
        renderItem={renderWordItem}
        keyExtractor={(item) => `${item.userId}-${item.date}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyText}>No words yet</Text>
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
  },
  wordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordInfo: {
    flex: 1,
  },
  wordText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  wordDate: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 16,
  },
  wordDefinition: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});

