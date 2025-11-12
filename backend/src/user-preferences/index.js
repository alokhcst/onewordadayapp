import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USERS_TABLE = process.env.USERS_TABLE;

/**
 * Lambda handler for user preferences management
 * API: GET /user/profile, PUT /user/profile
 */
export const handler = async (event) => {
  console.log('========================================');
  console.log('STEP 1: Handler triggered');
  console.log('========================================');
  console.log('Event:', JSON.stringify(event, null, 2));

  try {
    console.log('\nSTEP 2: Extracting Cognito claims');
    console.log('----------------------------------------');
    
    // Extract user ID from Cognito authorizer
    const claims = event.requestContext?.authorizer?.claims || {};
    console.log('Raw claims object:', JSON.stringify(claims, null, 2));
    
    const userId = claims.sub;
    const email = claims.email;
    
    // Try different name fields in order of preference
    // Cognito can use different attribute names depending on how user signed up
    let name = null;
    const nameFields = ['name', 'given_name', 'cognito:username', 'preferred_username', 'username', 'nickname'];
    for (const field of nameFields) {
      if (claims[field]) {
        name = claims[field];
        console.log(`Found name in field "${field}": ${name}`);
        break;
      }
    }
    
    // If still no name, try to extract from email
    if (!name && email) {
      name = email.split('@')[0];
      console.log(`Extracted name from email: ${name}`);
    }
    
    console.log('\nExtracted values:');
    console.log('  - userId:', userId);
    console.log('  - email:', email);
    console.log('  - name:', name);
    console.log('  - All claim keys:', Object.keys(claims));
    
    if (!userId) {
      console.log('\nERROR: No userId found in claims!');
      console.log('========================================\n');
      return {
        statusCode: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Unauthorized' })
      };
    }

    console.log('\nSTEP 3: Determining HTTP method');
    console.log('----------------------------------------');
    const httpMethod = event.httpMethod || event.requestContext?.http?.method;
    console.log('  - HTTP Method:', httpMethod);

    if (httpMethod === 'GET') {
      console.log('  - Route: GET /user/profile');
      console.log('========================================\n');
      return await getUserProfile(userId, email, name);
    } else if (httpMethod === 'PUT') {
      console.log('  - Route: PUT /user/profile');
      console.log('========================================\n');
      return await updateUserProfile(userId, email, name, event.body);
    } else {
      console.log('  - ERROR: Unsupported method:', httpMethod);
      console.log('========================================\n');
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
    console.log('\n========================================');
    console.log('FATAL ERROR in handler');
    console.log('========================================');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('========================================\n');
    
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
async function getUserProfile(userId, email, name) {
  console.log('GET USER PROFILE - START');
  console.log('========================================');
  console.log('Input parameters:');
  console.log('  - userId:', userId);
  console.log('  - email:', email);
  console.log('  - name:', name);
  
  try {
    console.log('\nSTEP 1: Querying DynamoDB for user');
    console.log('  - Table:', USERS_TABLE);
    console.log('  - Key:', { userId });
    
    const params = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const result = await docClient.send(new GetCommand(params));
    console.log('  - Query result received');
    console.log('  - Item exists:', !!result.Item);
    
    if (!result.Item) {
      console.log('\nSTEP 2: User NOT found - Creating default profile');
      console.log('----------------------------------------');
      
      // Ensure we have valid name and email
      // IMPORTANT: username should be the user's DISPLAY NAME, not userId
      const finalName = name || (email ? email.split('@')[0] : 'User');
      const finalEmail = email || null;
      
      console.log('  - Creating profile with:');
      console.log('    * userId (ID):', userId);
      console.log('    * name (Display Name):', finalName);
      console.log('    * username (Same as name):', finalName);
      console.log('    * email:', finalEmail);
      
      const defaultProfile = {
        userId,  // This is the unique ID (UUID)
        email: finalEmail,
        name: finalName,  // This is the display name from Cognito
        username: finalName,  // This should match the display name, NOT userId
        ageGroup: 'adult',
        context: 'general',
        examPrep: null,
        notificationPreferences: {
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
        contactInfo: {
          expoPushToken: null,
          phoneNumber: null
        },
        timezone: 'UTC',
        language: 'en',
        learningPatterns: {
          totalWords: 0,
          practicedWords: 0,
          averageRating: 0,
          difficultyPreference: 'medium',
          lastFeedbackDate: null
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      console.log('  - Default profile created:');
      console.log('    * userId:', defaultProfile.userId);
      console.log('    * email:', defaultProfile.email);
      console.log('    * name:', defaultProfile.name);
      
      console.log('\nSTEP 3: Storing default profile in DynamoDB');
      // Store default profile
      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: defaultProfile
      }));
      console.log('  - Profile stored successfully');
      
      console.log('\nSTEP 4: Returning response (new profile)');
      console.log('========================================\n');
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'User profile created with defaults',
          profile: defaultProfile,
          isNew: true
        })
      };
    }

    console.log('\nSTEP 2: User found - Processing existing profile');
    console.log('----------------------------------------');
    console.log('  - Existing profile data:');
    console.log('    * userId:', result.Item.userId);
    console.log('    * email:', result.Item.email);
    console.log('    * name:', result.Item.name);
    console.log('    * username:', result.Item.username);
    console.log('    * ageGroup:', result.Item.ageGroup);
    console.log('    * context:', result.Item.context);
    
    // Determine best values for email and name
    // IMPORTANT: username should be the user's DISPLAY NAME, not userId
    const bestEmail = email || result.Item.email || null;
    const bestName = name || result.Item.name || result.Item.username || (bestEmail ? bestEmail.split('@')[0] : 'User');
    
    console.log('\nSTEP 3: Merging with Cognito data');
    console.log('  - Source priority: Cognito > Existing DB > Email > Default');
    console.log('  - Best email:', bestEmail);
    console.log('  - Best name:', bestName);
    
    // Ensure profile has latest email and name from Cognito
    const profile = {
      ...result.Item,
      email: bestEmail,
      name: bestName,  // Display name from Cognito
      username: bestName  // Should match display name, NOT userId
    };
    
    console.log('  - Updated profile:');
    console.log('    * userId (ID):', profile.userId);
    console.log('    * email:', profile.email);
    console.log('    * name (Display Name):', profile.name);
    console.log('    * username (Same as name):', profile.username);
    
    // Update profile if email or name were missing
    if (!result.Item.email || !result.Item.name) {
      console.log('\nSTEP 4: Updating profile with missing Cognito data');
      console.log('  - Updating email:', email);
      console.log('  - Updating name:', name);
      
      await docClient.send(new PutCommand({
        TableName: USERS_TABLE,
        Item: profile
      }));
      
      console.log('  - Profile updated in DynamoDB');
    } else {
      console.log('\nSTEP 4: Profile complete - no update needed');
    }

    console.log('\nSTEP 5: Returning profile response');
    console.log('========================================\n');
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'User profile retrieved',
        profile: profile
      })
    };
  } catch (error) {
    console.log('\n========================================');
    console.log('ERROR in getUserProfile');
    console.log('========================================');
    console.error('Error details:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.log('========================================\n');
    throw error;
  }
}

/**
 * Update or create user profile
 */
async function updateUserProfile(userId, email, name, requestBody) {
  console.log('UPDATE USER PROFILE - START');
  console.log('========================================');
  console.log('Input parameters:');
  console.log('  - userId:', userId);
  console.log('  - email:', email);
  console.log('  - name:', name);
  console.log('  - requestBody length:', requestBody?.length || 0);
  
  try {
    console.log('\nSTEP 1: Parsing request body');
    const body = JSON.parse(requestBody || '{}');
    console.log('  - Parsed body keys:', Object.keys(body));
    console.log('  - Body data:', JSON.stringify(body, null, 2));
    
    console.log('\nSTEP 2: Checking for existing user');
    console.log('  - Table:', USERS_TABLE);
    console.log('  - userId:', userId);
    
    // Get existing user data
    const getParams = {
      TableName: USERS_TABLE,
      Key: { userId }
    };

    const existingUser = await docClient.send(new GetCommand(getParams));
    const isNewUser = !existingUser.Item;
    
    console.log('  - Is new user:', isNewUser);
    if (!isNewUser) {
      console.log('  - Existing email:', existingUser.Item.email);
      console.log('  - Existing name:', existingUser.Item.name);
    }

    // Determine best values for email and name
    // IMPORTANT: username should be the user's DISPLAY NAME, not userId
    const bestEmail = email || body.email || existingUser.Item?.email || null;
    const bestName = name || body.name || body.username || existingUser.Item?.name || existingUser.Item?.username || (bestEmail ? bestEmail.split('@')[0] : 'User');
    
    console.log('  - Source priority: Cognito > Request Body > Existing DB > Email > Default');
    console.log('  - Best email:', bestEmail);
    console.log('  - Best name (will be used for username too):', bestName);
    
    // Prepare user data - prioritize Cognito data over body
    const userData = {
      userId,  // This is the unique ID (UUID)
      email: bestEmail,
      name: bestName,  // Display name from Cognito or input
      username: bestName,  // Should match display name, NOT userId
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

    console.log('\nSTEP 3: Building final user data');
    console.log('  - Final userData object:');
    console.log('    * userId (Unique ID):', userData.userId);
    console.log('    * email:', userData.email);
    console.log('    * name (Display Name):', userData.name);
    console.log('    * username (Same as name, NOT userId):', userData.username);
    console.log('    * ageGroup:', userData.ageGroup);
    console.log('    * context:', userData.context);
    console.log('    * examPrep:', userData.examPrep);
    console.log('  - VERIFICATION: username === name?', userData.username === userData.name);
    console.log('  - VERIFICATION: username !== userId?', userData.username !== userData.userId);
    
    // Add createdAt for new users
    if (isNewUser) {
      userData.createdAt = new Date().toISOString();
      userData.lastLoginAt = new Date().toISOString();
      console.log('  - Added createdAt:', userData.createdAt);
    }

    console.log('\nSTEP 4: Storing user data in DynamoDB');
    console.log('  - Table:', USERS_TABLE);
    console.log('  - Operation:', isNewUser ? 'CREATE' : 'UPDATE');
    
    // Store user data
    const putParams = {
      TableName: USERS_TABLE,
      Item: userData
    };

    await docClient.send(new PutCommand(putParams));

    console.log('  - Save successful!');
    
    console.log('\nSTEP 5: Returning response');
    console.log('  - Status: 200');
    console.log('  - Message:', isNewUser ? 'Profile created' : 'Profile updated');
    console.log('========================================\n');

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
    console.log('\n========================================');
    console.log('ERROR in updateUserProfile');
    console.log('========================================');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));
    console.log('========================================\n');
    throw error;
  }
}

