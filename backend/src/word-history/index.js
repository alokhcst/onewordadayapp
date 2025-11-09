import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const DAILY_WORDS_TABLE = process.env.DAILY_WORDS_TABLE;

/**
 * Lambda handler for getting word history
 * API: GET /word/history
 */
export const handler = async (event) => {
  console.log('Word history handler triggered', { event });

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

    // Query parameters
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '30');
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate || new Date().toISOString().split('T')[0];
    const searchTerm = queryParams.search;

    // Build query
    let params = {
      TableName: DAILY_WORDS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      ScanIndexForward: false, // Sort by date descending (newest first)
      Limit: limit
    };

    // Add date range if provided
    if (startDate) {
      params.KeyConditionExpression += ' AND #date BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeNames = { '#date': 'date' };
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }

    // Execute query
    const result = await docClient.send(new QueryCommand(params));
    let words = result.Items || [];

    // Filter by search term if provided
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      words = words.filter(word => 
        word.word.toLowerCase().includes(searchLower) ||
        word.definition.toLowerCase().includes(searchLower)
      );
    }

    // Calculate statistics
    const stats = {
      totalWords: words.length,
      practicedWords: words.filter(w => w.practiceStatus === 'practiced').length,
      skippedWords: words.filter(w => w.practiceStatus === 'skipped').length,
      pendingWords: words.filter(w => w.practiceStatus === 'pending').length
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Word history retrieved',
        stats,
        words,
        count: words.length,
        hasMore: result.LastEvaluatedKey ? true : false
      })
    };
  } catch (error) {
    console.error('Error getting word history:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Error retrieving word history',
        error: error.message
      })
    };
  }
};

