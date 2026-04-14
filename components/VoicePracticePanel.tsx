import { api } from '@/lib/api';
import type { VoicePracticeResult } from '@/lib/voicePracticeTypes';
import { getMembershipBadge, type MembershipLevel } from '@/lib/points';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const MAX_RECORDING_MS = 30000;
const MIN_RECORDING_MS = 500;

type Props = {
  wordId: string;
  date: string;
  targetWord: string;
  onSuccess?: (result: VoicePracticeResult) => void;
};

export function VoicePracticePanel({ wordId, date, targetWord, onSuccess }: Props) {
  const [permission, setPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<VoicePracticeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attemptsHint, setAttemptsHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const stoppingRef = useRef(false);
  const startedAtRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const stopRecording = useCallback(async () => {
    if (stoppingRef.current) return;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const rec = recordingRef.current;
    if (!rec) return;
    stoppingRef.current = true;
    recordingRef.current = null;
    try {
      setIsRecording(false);
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) {
        setError('Could not read recording.');
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed < MIN_RECORDING_MS) {
        setError('Hold a little longer (at least half a second).');
        return;
      }
      setProcessing(true);
      setError(null);
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });
      const mimeType = 'audio/m4a';
      const data = (await api.submitVoicePractice({
        wordId,
        date,
        audioBase64: base64,
        mimeType,
      })) as VoicePracticeResult;
      setResult(data);
      setAttemptsHint(`${data.attemptsRemaining} attempt${data.attemptsRemaining === 1 ? '' : 's'} left today`);
      if (data.scoreCorrect && data.pointsAwarded && data.reward?.levelChanged) {
        const badge = getMembershipBadge(data.reward.newLevel as MembershipLevel);
        setAttemptsHint(`Level up: ${badge.label}`);
      }
      onSuccess?.(data);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Something went wrong. Check your connection and try again.';
      setError(typeof msg === 'string' ? msg : 'Request failed');
    } finally {
      setProcessing(false);
      stoppingRef.current = false;
    }
  }, [wordId, date, onSuccess]);

  const startRecording = useCallback(async () => {
    if (Platform.OS === 'web') {
      setError('Voice practice requires the iOS or Android app.');
      return;
    }
    if (stoppingRef.current || recordingRef.current) return;
    setError(null);
    setResult(null);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermission(false);
        setError('Microphone permission is required to practice.');
        return;
      }
      setPermission(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      recordingRef.current = rec;
      setIsRecording(true);
      startedAtRef.current = Date.now();
      timerRef.current = setTimeout(() => {
        void stopRecording();
      }, MAX_RECORDING_MS);
    } catch (e) {
      console.error(e);
      setError('Could not start recording.');
      recordingRef.current = null;
      setIsRecording(false);
    }
  }, [stopRecording]);

  const onPressIn = () => {
    void startRecording();
  };

  const onPressOut = () => {
    if (isRecording) {
      void stopRecording();
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.card}>
        <Text style={styles.webHint}>
          Voice practice (hold to speak) is available in the mobile app.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Say the word</Text>
      <Text style={styles.sub}>
        Hold the button, speak clearly, then release. Max {MAX_RECORDING_MS / 1000}s. Up to 10 tries per
        day.
      </Text>

      {permission === false && (
        <Text style={styles.err}>Enable the microphone in Settings to use this feature.</Text>
      )}

      <Pressable
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={processing}
        style={({ pressed }) => [
          styles.holdButton,
          isRecording && styles.holdButtonActive,
          pressed && styles.holdButtonPressed,
        ]}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name={isRecording ? 'mic' : 'mic-outline'} size={28} color="#fff" />
            <Text style={styles.holdButtonText}>
              {isRecording ? 'Recording… release to finish' : 'Hold to speak'}
            </Text>
          </>
        )}
      </Pressable>

      {attemptsHint && !result && <Text style={styles.hint}>{attemptsHint}</Text>}
      {error && <Text style={styles.err}>{error}</Text>}

      {result && (
        <View style={styles.resultBlock}>
          {attemptsHint ? <Text style={styles.hint}>{attemptsHint}</Text> : null}
          <Text style={styles.resultLabel}>You said</Text>
          <Text style={styles.transcript}>{result.transcript || '(empty)'}</Text>
          <Text style={styles.resultLabel}>Target</Text>
          <Text style={styles.target}>{result.targetWord}</Text>
          <Text style={[styles.badge, result.scoreCorrect ? styles.badgeOk : styles.badgeBad]}>
            {result.scoreCorrect ? 'Great — match!' : 'Keep practicing'}
          </Text>
          {result.pointsAwarded > 0 && (
            <Text style={styles.points}>+{result.pointsAwarded} points</Text>
          )}
          {result.mistakes?.length > 0 && (
            <>
              <Text style={styles.resultLabel}>Notes</Text>
              {result.mistakes.map((m, i) => (
                <Text key={i} style={styles.bullet}>
                  • {m}
                </Text>
              ))}
            </>
          )}
          {result.suggestions?.length > 0 && (
            <>
              <Text style={styles.resultLabel}>Suggestions</Text>
              {result.suggestions.map((m, i) => (
                <Text key={i} style={styles.bullet}>
                  • {m}
                </Text>
              ))}
            </>
          )}
          {result.review?.whatWentWell?.length > 0 && (
            <>
              <Text style={styles.resultLabel}>What went well</Text>
              {result.review.whatWentWell.map((m, i) => (
                <Text key={i} style={styles.bullet}>
                  • {m}
                </Text>
              ))}
            </>
          )}
          {result.review?.toImprove?.length > 0 && (
            <>
              <Text style={styles.resultLabel}>To improve</Text>
              {result.review.toImprove.map((m, i) => (
                <Text key={i} style={styles.bullet}>
                  • {m}
                </Text>
              ))}
            </>
          )}
          {result.followUpQuestions?.length > 0 && (
            <>
              <Text style={styles.resultLabel}>Try answering</Text>
              {result.followUpQuestions.map((m, i) => (
                <Text key={i} style={styles.bullet}>
                  • {m}
                </Text>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 14,
  },
  holdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  holdButtonActive: {
    backgroundColor: '#2563eb',
  },
  holdButtonPressed: {
    opacity: 0.9,
  },
  holdButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  err: {
    marginTop: 10,
    fontSize: 14,
    color: '#b91c1c',
  },
  resultBlock: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 10,
    marginBottom: 4,
  },
  transcript: {
    fontSize: 16,
    color: '#0f172a',
  },
  target: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A90E2',
  },
  badge: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
  },
  badgeOk: {
    color: '#15803d',
  },
  badgeBad: {
    color: '#b45309',
  },
  points: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: '700',
    color: '#4A90E2',
  },
  bullet: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  webHint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
