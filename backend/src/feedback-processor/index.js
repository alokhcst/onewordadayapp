import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;
const FEEDBACK_TABLE = process.env.FEEDBACK_TABLE;

/**
 * Lambda handler for processing user feedback
 * API: POST /feedback
 */
export const handler = async (event) => {
  console.log('Feedback processor triggered', { event });

  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext?.authorizer?.claims?.sub;
    
    if (!userId) {
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Unauthorized' })
      };
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const {
      wordId,
      date,
      rating,
      practiced,
      encountered,
      difficulty,
      additionalContext,
      comments
    } = body;

    // Validate input
    if (!wordId || !date) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'wordId and date are required' })
      };
    }

    // Create feedback entry
    const feedbackId = randomUUID();
    const feedbackData = {
      feedbackId,
      userId,
      wordId,
      date,
      rating: rating || 0,
      practiced: practiced || false,
      encountered: encountered || false,
      difficulty: difficulty || 'appropriate', // 'too_easy', 'appropriate', 'too_difficult'
      additionalContext: additionalContext || '',
      comments: comments || '',
      timestamp: new Date().toISOString()
    };

    // Store feedback
    await storeFeedback(feedbackData);

    // Update user learning patterns
    await updateUserLearningPatterns(userId, feedbackData);

    // Update daily word practice status and rating
    await updateWordPracticeStatus(userId, date, practiced, rating);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Feedback submitted successfully',
        feedbackId,
        data: feedbackData
      })
    };
  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error processing feedback',
        error: error.message
      })
    };
  }
};

/**
 * Store feedback in DynamoDB
 */
async function storeFeedback(feedbackData) {
  const params = {
    TableName: FEEDBACK_TABLE,
    Item: feedbackData
  };

  await docClient.send(new PutCommand(params));
}

/**
 * Update user learning patterns based on feedback
 */
async function updateUserLearningPatterns(userId, feedbackData) {
  try {
    // Get current user data
    const getUserParams = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const userResult = await docClient.send(new GetCommand(getUserParams));
    const user = userResult.Item || {};

    // Calculate learning metrics
    const learningPatterns = user.learningPatterns || {
      totalWords: 0,
      practicedWords: 0,
      averageRating: 0,
      difficultyPreference: 'medium',
      lastFeedbackDate: null
    };

    learningPatterns.totalWords += 1;
    if (feedbackData.practiced) {
      learningPatterns.practicedWords += 1;
    }

    // Update average rating
    if (feedbackData.rating > 0) {
      const totalRating = (learningPatterns.averageRating * (learningPatterns.totalWords - 1)) + feedbackData.rating;
      learningPatterns.averageRating = totalRating / learningPatterns.totalWords;
    }

    // Adjust difficulty preference based on feedback
    if (feedbackData.difficulty === 'too_easy') {
      // User finds words too easy, increase difficulty preference
      if (learningPatterns.difficultyPreference === 'easy') {
        learningPatterns.difficultyPreference = 'medium';
      } else if (learningPatterns.difficultyPreference === 'medium') {
        learningPatterns.difficultyPreference = 'hard';
      }
    } else if (feedbackData.difficulty === 'too_difficult') {
      // User finds words too hard, decrease difficulty preference
      if (learningPatterns.difficultyPreference === 'hard') {
        learningPatterns.difficultyPreference = 'medium';
      } else if (learningPatterns.difficultyPreference === 'medium') {
        learningPatterns.difficultyPreference = 'easy';
      }
    }

    learningPatterns.lastFeedbackDate = new Date().toISOString();

    // Update user record
    const updateParams = {
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET learningPatterns = :patterns, lastFeedbackAt = :feedbackAt',
      ExpressionAttributeValues: {
        ':patterns': learningPatterns,
        ':feedbackAt': new Date().toISOString()
      }
    };

    await docClient.send(new UpdateCommand(updateParams));
  } catch (error) {
    console.error('Error updating learning patterns:', error);
    // Don't throw - feedback is still recorded even if pattern update fails
  }
}

/**
 * Update word practice status
 */
async function updateWordPracticeStatus(userId, date, practiced, rating) {
  try {
    if (!process.env.DAILY_WORDS_TABLE) {
      console.error('DAILY_WORDS_TABLE environment variable not set');
      return;
    }

    const updateParams = {
      TableName: process.env.DAILY_WORDS_TABLE,
      Key: {
        userId,
        date
      },
      UpdateExpression: 'SET practiceStatus = :status, practiceAt = :practiceAt, rating = :rating',
      ExpressionAttributeValues: {
        ':status': practiced ? 'practiced' : 'skipped',
        ':practiceAt': new Date().toISOString(),
        ':rating': rating || 0
      }
    };

    await docClient.send(new UpdateCommand(updateParams));
  } catch (error) {
    console.error('Error updating word practice status:', error);
    // Don't throw - feedback is still recorded
  }
}

