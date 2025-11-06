import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🤔</Text>
        <Text style={styles.title}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#4A90E2',
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});

