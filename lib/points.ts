import AsyncStorage from '@react-native-async-storage/async-storage';

export type MembershipLevel = 'member' | 'silver' | 'gold' | 'platinum' | 'diamond';

const POINTS_PER_FEEDBACK = 1000;
const STORAGE_KEYS = {
  points: 'user_points_total',
  awardedFeedback: 'user_points_awarded_feedback',
};

const LEVEL_THRESHOLDS: Array<{ level: MembershipLevel; minPoints: number }> = [
  { level: 'diamond', minPoints: 100000 },
  { level: 'platinum', minPoints: 75000 },
  { level: 'gold', minPoints: 50000 },
  { level: 'silver', minPoints: 25000 },
  { level: 'member', minPoints: 0 },
];

export const getMembershipLevel = (points: number): MembershipLevel => {
  const match = LEVEL_THRESHOLDS.find((entry) => points >= entry.minPoints);
  return match ? match.level : 'member';
};

export const getMembershipBadge = (level: MembershipLevel) => {
  switch (level) {
    case 'diamond':
      return { label: 'Diamond Member', color: '#8A3FFC' };
    case 'platinum':
      return { label: 'Platinum Member', color: '#6C7A89' };
    case 'gold':
      return { label: 'Gold Member', color: '#D4A017' };
    case 'silver':
      return { label: 'Silver Member', color: '#8C9AA9' };
    default:
      return { label: 'Member', color: '#4A90E2' };
  }
};

export const getPointsState = async () => {
  const storedPoints = await AsyncStorage.getItem(STORAGE_KEYS.points);
  const points = storedPoints ? Number(storedPoints) : 0;
  const normalizedPoints = Number.isFinite(points) ? points : 0;

  return {
    points: normalizedPoints,
    level: getMembershipLevel(normalizedPoints),
  };
};

const loadAwardedFeedback = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.awardedFeedback);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as Record<string, boolean>;
  } catch {
    return {};
  }
};

export const awardFeedbackPoints = async (wordId: string, date: string) => {
  const key = `${wordId}:${date}`;
  const awarded = await loadAwardedFeedback();

  if (awarded[key]) {
    const current = await getPointsState();
    return {
      addedPoints: 0,
      points: current.points,
      previousLevel: current.level,
      newLevel: current.level,
      levelChanged: false,
    };
  }

  const currentPointsState = await getPointsState();
  const previousLevel = currentPointsState.level;
  const newPoints = currentPointsState.points + POINTS_PER_FEEDBACK;
  const newLevel = getMembershipLevel(newPoints);

  await AsyncStorage.setItem(STORAGE_KEYS.points, String(newPoints));
  awarded[key] = true;
  await AsyncStorage.setItem(STORAGE_KEYS.awardedFeedback, JSON.stringify(awarded));

  return {
    addedPoints: POINTS_PER_FEEDBACK,
    points: newPoints,
    previousLevel,
    newLevel,
    levelChanged: previousLevel !== newLevel,
  };
};
