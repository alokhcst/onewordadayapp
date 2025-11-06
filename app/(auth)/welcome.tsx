import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#4A90E2', '#50C878']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.emoji}>📚</Text>
          <Text style={styles.title}>One Word A Day</Text>
          <Text style={styles.subtitle}>Expand your vocabulary, one word at a time</Text>
        </View>

        <View style={styles.features}>
          <FeatureItem icon="🎯" text="Personalized daily words" />
          <FeatureItem icon="🔔" text="Smart notifications" />
          <FeatureItem icon="📈" text="Track your progress" />
          <FeatureItem icon="🌟" text="Context-aware learning" />
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push('/(auth)/signin')}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 30,
    paddingTop: 80,
    paddingBottom: 50,
  },
  header: {
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
  },
  features: {
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 15,
    borderRadius: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  featureText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  buttons: {
    gap: 15,
  },
  button: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#fff',
  },
  primaryButtonText: {
    color: '#4A90E2',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

