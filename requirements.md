One Word A Day - Detailed Requirements Document
1. Executive Summary
Application Name: One Word A Day
Platform: React Native with Expo Go
Primary Objective: Enhance user vocabulary through personalized, context-aware daily word learning with practice reinforcement
Target Users: Students, professionals, exam aspirants (IELTS, TOEFL), and lifelong learners across different age groups

2. Core Features & Functionality
2.1 Daily Word Generation Engine
Personalization Parameters:

User Age: Child (6-12), Teen (13-17), Young Adult (18-25), Adult (26-45), Senior (45+)
Context Categories:

Educational: School, College, University
Professional: Corporate, Business, Entrepreneurship
Exam Preparation: IELTS, TOEFL, SAT, GRE, Spelling Bee
General: Daily Life, Social Settings



Word Components:

The Word: Display with syllable breakdown (e.g., vo-cab-u-lar-y)
Part of Speech: Noun, Verb, Adjective, etc.
Pronunciation: IPA notation and phonetic spelling
Audio Pronunciation: Native speaker audio clip
Definition: Age and context-appropriate meaning
Etymology: Optional word origin (for advanced users)
Synonyms & Antonyms: 3-5 related words
Contextual Sentences: 3 sample sentences tailored to user's context
Visual Aid: Optional relevant image or illustration

2.2 Context-Aware Word Selection
Daily Event Scraping:

Integration with news APIs to fetch current events
User-provided additional context (free text input)
Trending topics in user's field of interest
Seasonal and cultural events

Selection Algorithm:

Difficulty level based on age
Relevance to user's context
Spaced repetition consideration (avoid recent words)
Balance between common and advanced vocabulary


3. Technical Architecture (AWS-Based)
3.1 Frontend Stack
Technology:

React Native with Expo Go
Expo SDK for native features (notifications, audio)
React Navigation for routing
Redux/Context API for state management
Axios for API calls

Key Screens:

Onboarding & Profile Setup
Daily Word Display
Word History/Archive
Settings & Preferences
Feedback Submission

3.2 Backend Architecture (AWS Services)
3.2.1 Authentication & Authorization
AWS Cognito:

User Pool for authentication
Identity Pool for AWS resource access
Social Sign-In: Google OAuth 2.0
MFA (Multi-Factor Authentication) optional
Password policies and account recovery

User Attributes:
json{
  "sub": "user-id",
  "email": "user@example.com",
  "name": "User Name",
  "custom:age_group": "young_adult",
  "custom:context": "corporate",
  "custom:exam_prep": "ielts",
  "custom:notification_preferences": "{...}"
}
```

#### **3.2.2 API Layer**

**AWS API Gateway:**
- RESTful API endpoints
- Lambda authorizer with Cognito JWT tokens
- Rate limiting and throttling
- CORS configuration
- API versioning (v1)

**Endpoints:**
```
POST   /auth/register
POST   /auth/login
GET    /user/profile
PUT    /user/profile
GET    /word/today
GET    /word/history
POST   /feedback
PUT    /preferences/notifications
GET    /context/events
```

#### **3.2.3 Compute Layer**

**AWS Lambda Functions:**

1. **WordGenerationFunction:**
   - Trigger: EventBridge (daily schedule)
   - Fetches user preferences from DynamoDB
   - Calls word selection algorithm
   - Generates personalized content
   - Stores in DynamoDB

2. **ContentEnrichmentFunction:**
   - Fetches word definitions from Dictionary API
   - Generates contextual sentences using AI (Bedrock)
   - Retrieves pronunciation audio
   - Scrapes news/events (if enabled)

3. **NotificationDispatcherFunction:**
   - Trigger: EventBridge (user-scheduled times)
   - Sends notifications via SNS
   - Tracks delivery status

4. **FeedbackProcessorFunction:**
   - Processes user feedback
   - Updates user learning patterns
   - Stores in DynamoDB

5. **UserPreferencesFunction:**
   - Handles profile updates
   - Updates notification schedules

**Runtime:** Node.js 18.x or Python 3.11

#### **3.2.4 Data Storage**

**Amazon DynamoDB:**

**Tables:**

1. **Users Table:**
```
Primary Key: userId (String)
Attributes:
- email, name, ageGroup, context, examPrep
- notificationPreferences (Map)
- timezone, language
- createdAt, lastLoginAt
```

2. **DailyWords Table:**
```
Primary Key: userId (String)
Sort Key: date (String - YYYY-MM-DD)
Attributes:
- word, syllables, pronunciation, definition
- partOfSpeech, sentences[], synonyms[], antonyms[]
- audioUrl, imageUrl
- contextEvents[], userContext
- practiceStatus (practiced/skipped)
```

3. **WordBank Table:**
```
Primary Key: wordId (String)
Attributes:
- word, difficulty, category, frequency
- definition, examples[], pronunciation
- ageGroups[], contexts[]
```

4. **Feedback Table:**
```
Primary Key: feedbackId (String)
Sort Key: userId (String)
Attributes:
- date, wordId, rating, comments
- practiceCount, contextNotes
- timestamp
```

5. **NotificationLogs Table:**
```
Primary Key: logId (String)
Attributes:
- userId, date, channel (push/sms/email)
- status, deliveredAt, errorMessage
```

**Global Secondary Indexes:**
- Users by email
- DailyWords by date
- Feedback by userId and date

#### **3.2.5 Storage**

**Amazon S3:**
- **Bucket: word-audio-files**
  - Pronunciation audio files (MP3)
  - Organized by word: `/audio/{word}.mp3`
  
- **Bucket: word-images**
  - Visual aids and illustrations
  - Path: `/images/{wordId}.jpg`

- **Bucket: user-content**
  - User-generated content
  - Path: `/users/{userId}/...`

**CloudFront Distribution:**
- CDN for audio and image delivery
- Reduced latency for global users

#### **3.2.6 Notification Services**

**Amazon SNS (Simple Notification Service):**
- **Push Notifications:**
  - Platform applications for iOS/Android
  - Integration with Expo Push Notification Service
  
- **Email Notifications:**
  - Amazon SES integration via SNS
  - HTML formatted emails with word content
  
- **SMS Notifications:**
  - Direct SMS via SNS
  - Optional based on user preference

**Amazon SES (Simple Email Service):**
- Transactional emails
- Verified sender domain
- Email templates for consistency

**Implementation Flow:**
```
EventBridge (Schedule) 
  → Lambda (NotificationDispatcher)
  → Check User Preferences (DynamoDB)
  → Fetch Daily Word Content
  → Send via SNS Topics
    → Push (Expo PN)
    → SMS
    → Email (SES)
  → Log Delivery (DynamoDB)
3.2.7 Scheduling & Automation
Amazon EventBridge:

Daily Word Generation Rule:

Schedule: 00:00 UTC daily
Target: WordGenerationFunction Lambda
Generates words for all users


User-Specific Notification Rules:

Dynamic schedules per user preference
Targets: NotificationDispatcherFunction
Multiple rules per user if multi-channel


Feedback Reminder Rule:

Schedule: Evening time per user timezone
Target: FeedbackReminderFunction
Sends end-of-day feedback request



3.2.8 AI/ML Services
Amazon Bedrock:

Model: Claude or other LLM
Use Cases:

Generate contextual sentences based on user profile
Adapt word difficulty to user feedback patterns
Create personalized learning paths
Generate context-aware examples from daily events



Bedrock Function:
javascriptasync function generateContextualSentences(word, userContext, events) {
  // Prompt engineering for sentence generation
  // Returns 3 sentences tailored to context
}
3.2.9 External Integrations
Dictionary & Word APIs:

Merriam-Webster API: Definitions, pronunciation
Oxford Dictionaries API: Advanced definitions
Datamuse API: Related words, rhymes
Forvo API: Native pronunciation audio

News & Events APIs:

NewsAPI.org: Current events scraping
Google News RSS: Trending topics
User-provided context parsing

3.2.10 Monitoring & Logging
Amazon CloudWatch:

Lambda function logs and metrics
DynamoDB performance metrics
API Gateway request/error logs
Custom metrics: Daily active users, word generation success rate
Alarms for error rates, latency

AWS X-Ray:

Distributed tracing for API requests
Performance bottleneck identification
Service map visualization

3.2.11 Security
AWS WAF (Web Application Firewall):

Protect API Gateway from common exploits
Rate limiting rules
IP whitelisting/blacklisting

AWS Secrets Manager:

Store third-party API keys
Database connection strings
Rotation policies

IAM Roles & Policies:

Principle of least privilege
Lambda execution roles with specific permissions
Cognito user pool policies

Encryption:

Data at rest: DynamoDB encryption
Data in transit: HTTPS/TLS
S3 bucket encryption


4. User Flows
4.1 User Onboarding

Launch App → Welcome Screen
Sign Up/Login:

Email/Password via Cognito
Google OAuth via Cognito Federated Identity


Profile Setup:

Age Group selection
Primary Context (School/Corporate/Exam)
Notification Preferences:

Channels: Push, SMS, Email
Preferred Time (with timezone)


Additional Context (optional text input)


Tutorial: Brief walkthrough of features
First Word Generation: Immediate generation of first word

4.2 Daily Word Interaction

Notification Received (Push/SMS/Email at user's preferred time)
Open App → Today's Word Screen
View Word Components:

Word with syllables
Tap pronunciation icon → Play audio
Read definition and meaning
View 3 contextual sentences
See synonyms/antonyms
Optional: View image/illustration


Practice Actions:

Mark as "Practiced"
Add to Favorites
Share word (social media integration)


Word History:

Access previous words
Search functionality
Filter by date/context



4.3 Feedback Loop

End-of-Day Notification (8 PM user timezone)

"Did you practice today's word?"


Feedback Form:

Rating: 1-5 stars
Checkboxes:

"I used this word today"
"I encountered this word naturally"
"Too easy / Too difficult"


Text Input: Additional context for tomorrow's word
Text Input: General comments


Submit Feedback → Stores in DynamoDB
Confirmation Message: "Thank you! Tomorrow's word will be tailored."

4.4 Settings Management

Profile Settings:

Update age group, context, exam prep
Change notification preferences
Update timezone


Notification Settings:

Toggle channels (Push/SMS/Email)
Set preferred times (multiple times allowed)
Enable/disable feedback reminders


Learning Preferences:

Difficulty level override
Enable/disable daily events integration
Language preferences (future)


Account Management:

Change password (Cognito)
Delete account
Logout




5. Notification System Details
5.1 Notification Types
1. Daily Word Notification:

Content: Word preview + "Tap to learn more"
Channels: Push, SMS, Email (user choice)
Timing: User-specified time in their timezone
Deep Link: Opens app to Today's Word screen

2. Feedback Reminder:

Content: "How did today's word go? Share your feedback!"
Channels: Push notification only (less intrusive)
Timing: Evening (20:00 user timezone)
Deep Link: Opens feedback form

3. Streak/Milestone Notifications:

Content: Celebrate achievements (7-day streak, 30 words learned)
Channels: Push notification
Timing: After feedback submission

5.2 Channel-Specific Implementation
Push Notifications (Expo Push Notifications):
javascript// Backend: Lambda sends to Expo PN service
await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: user.expoPushToken,
    title: 'Word of the Day: Serendipity',
    body: 'Tap to discover today\'s word!',
    data: { screen: 'TodaysWord', wordId: 'abc123' }
  })
});
SMS Notifications (Amazon SNS):
javascriptawait sns.publish({
  PhoneNumber: user.phoneNumber,
  Message: `Word of the Day: SERENDIPITY\nMeaning: Finding something good without looking for it.\nOpen app to learn more!`
}).promise();
Email Notifications (Amazon SES via SNS):

HTML template with styled word content
Includes all word components (definition, sentences, etc.)
CTA button linking to app

5.3 Notification Preferences Storage
json{
  "notificationPreferences": {
    "dailyWord": {
      "enabled": true,
      "channels": ["push", "email"],
      "time": "08:00",
      "timezone": "America/New_York"
    },
    "feedbackReminder": {
      "enabled": true,
      "time": "20:00"
    },
    "milestones": {
      "enabled": true
    }
  },
  "contactInfo": {
    "expoPushToken": "ExponentPushToken[xxx]",
    "phoneNumber": "+1234567890",
    "email": "user@example.com"
  }
}

6. Data Privacy & Compliance
6.1 User Consent

Explicit opt-in for SMS and email notifications
Clear privacy policy during onboarding
GDPR/CCPA compliance for data handling
Right to data deletion

6.2 Data Security

End-to-end encryption for sensitive data
PII (Personally Identifiable Information) minimization
Secure token storage (Expo SecureStore)
Regular security audits


7. Scalability Considerations
7.1 Performance Optimization

DynamoDB:

On-demand billing for unpredictable workloads
DAX (DynamoDB Accelerator) for caching
Batch operations for word generation


Lambda:

Provisioned concurrency for critical functions
Async processing for non-critical tasks
Function optimization for cold starts


API Gateway:

Caching enabled for GET requests
Throttling to prevent abuse



7.2 Cost Optimization

S3 Intelligent-Tiering for audio/image storage
CloudWatch Logs retention policies
Lambda memory optimization
Reserved Cognito pricing for high user volumes


8. Development Phases
Phase 1: MVP (Months 1-2)

User authentication (Cognito + Google)
Basic daily word generation (static word bank)
Single notification channel (Push)
Simple feedback form
Core UI screens

Phase 2: Enhanced Features (Months 3-4)

Context-aware word selection
Multiple notification channels (SMS, Email)
Word history and search
User preference customization
Daily events integration

Phase 3: AI Integration (Months 5-6)

Amazon Bedrock for sentence generation
Adaptive learning algorithm
Personalized word difficulty
Advanced analytics dashboard

Phase 4: Polish & Scale (Months 7-8)

Performance optimization
Comprehensive testing (unit, integration, E2E)
Beta user testing
App store submission (iOS/Android)


9. Success Metrics
9.1 User Engagement

Daily Active Users (DAU)
Weekly Active Users (WAU)
Average session duration
Word practice rate (% of users marking "practiced")
Feedback submission rate

9.2 Technical Metrics

API response time (<200ms for 95th percentile)
Notification delivery rate (>98%)
App crash rate (<0.1%)
Lambda cold start percentage

9.3 Learning Outcomes

User-reported word usage
Retention rate (7-day, 30-day)
Vocabulary growth (words learned)
User satisfaction scores


10. AWS Service Summary
ServicePurposeAWS CognitoUser authentication, Google OAuth, user poolAPI GatewayRESTful API endpoints, authorizationAWS LambdaServerless compute for business logicDynamoDBNoSQL database for users, words, feedbackS3Audio files, images, user content storageCloudFrontCDN for media deliverySNSPush, SMS, email notification deliverySESTransactional email sendingEventBridgeScheduled tasks, automationAmazon BedrockAI-powered content generationCloudWatchLogging, monitoring, alarmsX-RayDistributed tracing, debuggingSecrets ManagerAPI keys and secrets storageWAFAPI security, rate limitingIAMAccess control, permissions

11. Third-Party Dependencies

Expo SDK: Push notifications, audio playback, secure storage
Dictionary APIs: Merriam-Webster, Oxford
News APIs: NewsAPI.org
Pronunciation APIs: Forvo
Analytics: Expo Analytics or Amplitude


12. Future Enhancements

Multi-language support (Spanish, French, etc.)
Gamification (points, badges, leaderboards)
Social features (friend challenges, word sharing)
Offline mode with cached words
Widget support (iOS/Android home screen)
Voice input for pronunciation practice
AR (Augmented Reality) word visualizations
Premium tier with advanced features
