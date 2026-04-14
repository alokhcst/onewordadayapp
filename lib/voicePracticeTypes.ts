export type VoicePracticeReview = {
  whatWentWell: string[];
  toImprove: string[];
};

export type VoicePracticeResult = {
  transcript: string;
  targetWord: string;
  normalizedMatch: boolean;
  mistakes: string[];
  suggestions: string[];
  review: VoicePracticeReview;
  followUpQuestions: string[];
  attemptsRemaining: number;
  scoreCorrect: boolean;
  pointsAwarded: number;
  practicedMarked: boolean;
  reward?: {
    pointsAdded: number;
    pointsTotal: number;
    previousLevel: string;
    newLevel: string;
    levelChanged: boolean;
  };
};
