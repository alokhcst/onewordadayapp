const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Lambda handler for user preferences management
 * API: GET /user/profile, PUT /user/profile
 */
exports.handler = async (event) => {
  console.log('User preferences handler triggered', { event });

  try {
    // Extract user ID from Cognito authorizer
    const userId = event.requestContext?.authorizer?.claims?.sub;
    const email = event.requestContext?.authorizer?.claims?.email;
    const name = event.requestContext?.authorizer?.claims?.name;
    
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

    const httpMethod = event.httpMethod || event.requestContext?.http?.method;

    if (httpMethod === 'GET') {
      return await getUserProfile(userId);
    } else if (httpMethod === 'PUT') {
      return await updateUserProfile(userId, email, name, event.body);
    } else {
      return {
        statusCode: 405,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Error in user preferences handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error processing request',
        error: error.message
      })
    };
  }
};

/**
 * Get user profile
 */
async function getUserProfile(userId) {
  try {
    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const result = await docClient.send(new GetCommand(params));
    
    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'User profile retrieved',
        profile: result.Item
      })
    };
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * Update or create user profile
 */
async function updateUserProfile(userId, email, name, requestBody) {
  try {
    const body = JSON.parse(requestBody || '{}');
    
    // Get existing user data
    const getParams = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const existingUser = await docClient.send(new GetCommand(getParams));
    const isNewUser = !existingUser.Item;

    // Prepare user data
    const userData = {
      userId,
      email: email || existingUser.Item?.email,
      name: name || body.name || existingUser.Item?.name,
      ageGroup: body.ageGroup || existingUser.Item?.ageGroup || 'adult',
      context: body.context || existingUser.Item?.context || 'general',
      examPrep: body.examPrep || existingUser.Item?.examPrep || null,
      notificationPreferences: body.notificationPreferences || existingUser.Item?.notificationPreferences || {
        dailyWord: {
          enabled: true,
          channels: ['push'],
          time: '08:00',
          timezone: 'UTC'
        },
        feedbackReminder: {
          enabled: true,
          time: '20:00'
        },
        milestones: {
          enabled: true
        }
      },
      contactInfo: body.contactInfo || existingUser.Item?.contactInfo || {
        expoPushToken: body.expoPushToken || null,
        phoneNumber: body.phoneNumber || null,
        email: email
      },
      timezone: body.timezone || existingUser.Item?.timezone || 'UTC',
      language: body.language || existingUser.Item?.language || 'en',
      learningPatterns: existingUser.Item?.learningPatterns || {
        totalWords: 0,
        practicedWords: 0,
        averageRating: 0,
        difficultyPreference: 'medium',
        lastFeedbackDate: null
      },
      updatedAt: new Date().toISOString()
    };

    // Add createdAt for new users
    if (isNewUser) {
      userData.createdAt = new Date().toISOString();
      userData.lastLoginAt = new Date().toISOString();
    }

    // Store user data
    const putParams = {
      TableName: USERS_TABLE,
      Item: userData
    };

    await docClient.send(new PutCommand(putParams));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: isNewUser ? 'User profile created' : 'User profile updated',
        profile: userData
      })
    };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

