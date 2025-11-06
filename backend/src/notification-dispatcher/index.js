const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({});
const sesClient = new SESClient({});

const USERS_TABLE = process.env.USERS_TABLE;
const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;
const NOTIFICATION_LOGS_TABLE = process.env.NOTIFICATION_LOGS_TABLE;

/**
 * Lambda handler for notification dispatcher
 * Triggered hourly by EventBridge to check and send notifications
 */
exports.handler = async (event) => {
  console.log('Notification dispatcher triggered', { event });

  try {
    const currentHour = new Date().getUTCHours();
    const today = new Date().toISOString().split('T')[0];

    // Get users who should receive notifications at this hour
    const users = await getUsersForNotification(currentHour);
    console.log(`Found ${users.length} users for notification`);

    const results = [];

    for (const user of users) {
      try {
        // Get today's word for the user
        const wordData = await getTodaysWord(user.userId, today);
        
        if (!wordData) {
          console.log(`No word found for user ${user.userId}`);
          continue;
        }

        // Send notifications based on user preferences
        await sendNotifications(user, wordData);
        
        results.push({ userId: user.userId, success: true });
      } catch (error) {
        console.error(`Error sending notification to user ${user.userId}:`, error);
        results.push({ userId: user.userId, success: false, error: error.message });
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notifications processed',
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      })
    };
  } catch (error) {
    console.error('Error in notification dispatcher:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing notifications',
        error: error.message
      })
    };
  }
};

/**
 * Get users who should receive notifications at current hour
 */
async function getUsersForNotification(currentHour) {
  const params = {
    TableName: USERS_TABLE
  };

  const result = await docClient.send(new ScanCommand(params));
  const allUsers = result.Items || [];

  // Filter users based on notification preferences
  return allUsers.filter(user => {
    const prefs = user.notificationPreferences?.dailyWord;
    if (!prefs || !prefs.enabled) return false;

    // Convert user's preferred time to UTC and check if it matches current hour
    const preferredHour = parseInt(prefs.time?.split(':')[0] || '8');
    const timezone = prefs.timezone || 'UTC';
    
    // Simple hour matching (in production, use proper timezone conversion)
    return preferredHour === currentHour;
  });
}

/**
 * Get today's word for a user
 */
async function getTodaysWord(userId, date) {
  const params = {
    TableName: DAILY_WORDS_TABLE,
    Key: {
      userId,
      date
    }
  };

  const result = await docClient.send(new GetCommand(params));
  return result.Item;
}

/**
 * Send notifications via configured channels
 */
async function sendNotifications(user, wordData) {
  const prefs = user.notificationPreferences?.dailyWord;
  const channels = prefs?.channels || ['push'];

  const promises = [];

  if (channels.includes('push')) {
    promises.push(sendPushNotification(user, wordData));
  }

  if (channels.includes('email')) {
    promises.push(sendEmailNotification(user, wordData));
  }

  if (channels.includes('sms')) {
    promises.push(sendSMSNotification(user, wordData));
  }

  await Promise.allSettled(promises);
}

/**
 * Send push notification via Expo Push Notification Service
 */
async function sendPushNotification(user, wordData) {
  try {
    if (!user.contactInfo?.expoPushToken) {
      console.log(`No Expo push token for user ${user.userId}`);
      return;
    }

    const message = {
      to: user.contactInfo.expoPushToken,
      sound: 'default',
      title: `Word of the Day: ${wordData.word}`,
      body: `${wordData.definition.substring(0, 100)}...`,
      data: {
        screen: 'TodaysWord',
        wordId: wordData.wordId,
        date: wordData.date
      }
    };

    const response = await axios.post('https://exp.host/--/api/v2/push/send', message, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    await logNotification(user.userId, 'push', 'delivered', wordData.date);
    console.log(`Push notification sent to ${user.userId}:`, response.data);
  } catch (error) {
    console.error('Error sending push notification:', error);
    await logNotification(user.userId, 'push', 'failed', wordData.date, error.message);
  }
}

/**
 * Send email notification via Amazon SES
 */
async function sendEmailNotification(user, wordData) {
  try {
    if (!user.email) {
      console.log(`No email for user ${user.userId}`);
      return;
    }

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4A90E2; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; background: #f9f9f9; }
            .word { font-size: 32px; font-weight: bold; color: #4A90E2; margin-bottom: 10px; }
            .pronunciation { font-style: italic; color: #666; margin-bottom: 20px; }
            .definition { font-size: 18px; margin-bottom: 20px; }
            .section { margin: 20px 0; }
            .section-title { font-weight: bold; color: #4A90E2; margin-bottom: 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #4A90E2; 
                     color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📚 One Word A Day</h1>
            </div>
            <div class="content">
              <div class="word">${wordData.word}</div>
              <div class="pronunciation">${wordData.pronunciation}</div>
              <div class="definition">${wordData.definition}</div>
              
              <div class="section">
                <div class="section-title">Example Sentences:</div>
                ${wordData.sentences.map((s, i) => `<p>${i + 1}. ${s}</p>`).join('')}
              </div>
              
              ${wordData.synonyms && wordData.synonyms.length > 0 ? `
                <div class="section">
                  <div class="section-title">Synonyms:</div>
                  <p>${wordData.synonyms.join(', ')}</p>
                </div>
              ` : ''}
              
              <a href="onewordadayapp://word/${wordData.date}" class="button">
                Open in App
              </a>
            </div>
          </div>
        </body>
      </html>
    `;

    const params = {
      Source: 'noreply@yourdomain.com',
      Destination: {
        ToAddresses: [user.email]
      },
      Message: {
        Subject: {
          Data: `Word of the Day: ${wordData.word}`,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: emailBody,
            Charset: 'UTF-8'
          }
        }
      }
    };

    await sesClient.send(new SendEmailCommand(params));
    await logNotification(user.userId, 'email', 'delivered', wordData.date);
    console.log(`Email sent to ${user.email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    await logNotification(user.userId, 'email', 'failed', wordData.date, error.message);
  }
}

/**
 * Send SMS notification via Amazon SNS
 */
async function sendSMSNotification(user, wordData) {
  try {
    if (!user.contactInfo?.phoneNumber) {
      console.log(`No phone number for user ${user.userId}`);
      return;
    }

    const message = `Word of the Day: ${wordData.word.toUpperCase()}\n\nMeaning: ${wordData.definition.substring(0, 100)}...\n\nOpen the app to learn more!`;

    const params = {
      PhoneNumber: user.contactInfo.phoneNumber,
      Message: message
    };

    await snsClient.send(new PublishCommand(params));
    await logNotification(user.userId, 'sms', 'delivered', wordData.date);
    console.log(`SMS sent to ${user.contactInfo.phoneNumber}`);
  } catch (error) {
    console.error('Error sending SMS:', error);
    await logNotification(user.userId, 'sms', 'failed', wordData.date, error.message);
  }
}

/**
 * Log notification delivery status
 */
async function logNotification(userId, channel, status, date, errorMessage = null) {
  const params = {
    TableName: NOTIFICATION_LOGS_TABLE,
    Item: {
      logId: uuidv4(),
      userId,
      date,
      channel,
      status,
      deliveredAt: new Date().toISOString(),
      errorMessage,
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    }
  };

  await docClient.send(new PutCommand(params));
}

