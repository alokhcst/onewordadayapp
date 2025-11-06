import { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
}

export default function Toast({ message, type, onDismiss, duration = 3000 }: ToastProps) {
  const slideAnim = new Animated.Value(-100);

  useEffect(() => {
    // Slide in
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  const getIconName = () => {
    switch (type) {
      case 'success': return 'checkmark-circle';
      case 'error': return 'close-circle';
      case 'warning': return 'warning';
      case 'info': return 'information-circle';
      default: return 'information-circle';
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#4CAF50';
      case 'error': return '#F44336';
      case 'warning': return '#FF9800';
      case 'info': return '#2196F3';
      default: return '#2196F3';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: getBackgroundColor(), transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons name={getIconName()} size={24} color="#fff" />
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
        <Ionicons name="close" size={20} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 9999,
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  closeButton: {
    padding: 4,
  },
});

