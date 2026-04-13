# One Word A Day - Architecture & Process Flow Diagram



## Table of Contents
1. [Complete System Architecture](#complete-system-architecture)
2. [Authentication Flow](#authentication-flow)
3. [User Onboarding Flow](#user-onboarding-flow)
4. [Daily Word Flow](#daily-word-flow)
5. [User Profile Management](#user-profile-management)
6. [Backend Lambda Functions](#backend-lambda-functions)

---

## Complete System Architecture

```mermaid
graph TB
    subgraph "Frontend - Expo React Native"
        A[Web/Mobile App]
        A1[SignUp Screen]
        A2[SignIn Screen]
        A3[Confirm Screen]
        A4[Onboarding Screen]
        A5[Today Screen]
        A6[Profile Screen]
        A7[History Screen]
        A8[Feedback Screen]
    end

    subgraph "AWS Cognito"
        B[User Pool]
        B1[Email/Password Auth]
        B2[Google OAuth]
        B3[JWT Token Generation]
    end

    subgraph "AWS API Gateway"
        C[REST API Endpoint]
        C1["/word/today - GET"]
        C2["/user/profile - GET"]
        C3["/user/profile - PUT"]
        C4["/feedback - POST"]
        C5["/history - GET"]
    end

    subgraph "AWS Lambda Functions"
        D1[get-todays-word]
        D2[user-preferences GET]
        D3[user-preferences PUT]
        D4[submit-feedback]
        D5[get-history]
    end

    subgraph "Data Storage"
        E1[(DynamoDB - Users)]
        E2[(DynamoDB - Words)]
        E3[(DynamoDB - Feedback)]
    end

    subgraph "External APIs"
        F1[Groq AI - Word Generation]
        F2[Unsplash API - Images]
        F3[AWS Secrets Manager]
    end

    subgraph "Web Hosting"
        G1[S3 Bucket - Static Files]
        G2[CloudFront CDN]
        G3[Custom Domain HTTPS]
    end

    A --> A1 & A2 & A3 & A4 & A5 & A6 & A7 & A8
    A1 & A2 --> B
    B --> B1 & B2 --> B3
    B3 --> C
    
    A5 --> C1
    A6 --> C2 & C3
    A7 --> C5
    A8 --> C4
    
    C1 --> D1
    C2 --> D2
    C3 --> D3
    C4 --> D4
    C5 --> D5
    
    D1 --> E2 & F1 & F2 & F3
    D2 & D3 --> E1
    D4 --> E3
    D5 --> E2
    
    A --> G1
    G1 --> G2
    G2 --> G3
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant S as SignUp Screen
    participant SI as SignIn Screen
    participant C as Confirm Screen
    participant Auth as AuthContext
    participant Cog as AWS Cognito
    participant O as Onboarding Screen
    participant App as Main App

    Note over U,App: New User Sign Up Flow
    U->>S: Enter name, email, password
    S->>Auth: signUp(email, password, name)
    Auth->>Cog: signUp with SRP
    Cog-->>Auth: User created (needs confirmation)
    Auth-->>S: Success with userId
    S->>C: Navigate to Confirm (pass email, password)
    
    U->>C: Enter 6-digit code
    C->>Auth: confirmSignUp(email, code)
    Auth->>Cog: Confirm user
    Cog-->>Auth: User confirmed
    C->>Auth: signIn(email, password) [Auto sign-in]
    Auth->>Cog: Sign in with SRP
    Cog-->>Auth: JWT tokens (ID, Access, Refresh)
    Auth-->>C: User authenticated
    C->>O: Navigate to Onboarding
    
    Note over U,App: Onboarding Flow
    U->>O: Select Age Group (Step 1)
    U->>O: Select Context (Step 2)
    U->>O: Select Exam Prep (Step 3 - Optional)
    O->>Auth: Get user info (email, username)
    O->>API: PUT /user/profile
    API-->>O: Profile created
    O->>App: Navigate to Main App (/(tabs))

    Note over U,App: Existing User Sign In Flow
    U->>SI: Enter email, password
    SI->>Auth: signIn(email, password)
    Auth->>Cog: Check existing session
    Cog-->>Auth: No active session
    Auth->>Cog: Sign in with SRP
    Cog-->>Auth: JWT tokens
    Auth-->>SI: User authenticated
    SI->>App: Navigate to Main App

    Note over U,App: Google OAuth Flow
    U->>SI: Click "Sign in with Google"
    SI->>Auth: signInWithGoogle()
    Auth->>Cog: signInWithRedirect(provider: 'Google')
    Cog->>Google: OAuth redirect
    Google-->>Cog: User authenticated
    Cog-->>Auth: JWT tokens
    Auth-->>App: User authenticated
    App->>O: Navigate to Onboarding (if first time)
    App->>App: Navigate to Main App (if profile exists)
```

---

## User Onboarding Flow

```mermaid
flowchart TD
    Start([User Confirmed Email]) --> Step1[Step 1: Select Age Group]
    
    Step1 --> AgeOptions{Choose Age Group}
    AgeOptions -->|Child 6-12| Age1[ageGroup: 'child']
    AgeOptions -->|Teen 13-17| Age2[ageGroup: 'teen']
    AgeOptions -->|Young Adult 18-25| Age3[ageGroup: 'young_adult']
    AgeOptions -->|Adult 26-45| Age4[ageGroup: 'adult']
    AgeOptions -->|Senior 45+| Age5[ageGroup: 'senior']
    
    Age1 & Age2 & Age3 & Age4 & Age5 --> Step2[Step 2: Select Context]
    
    Step2 --> ContextOptions{Choose Context}
    ContextOptions -->|School| Ctx1[context: 'school']
    ContextOptions -->|College| Ctx2[context: 'college']
    ContextOptions -->|Corporate| Ctx3[context: 'corporate']
    ContextOptions -->|Business| Ctx4[context: 'business']
    ContextOptions -->|Exam Prep| Ctx5[context: 'exam_prep']
    ContextOptions -->|Daily Life| Ctx6[context: 'general']
    
    Ctx1 & Ctx2 & Ctx3 & Ctx4 & Ctx5 & Ctx6 --> Step3[Step 3: Exam Prep Optional]
    
    Step3 --> ExamOptions{Choose Exam or Skip}
    ExamOptions -->|GRE| Exam1[examPrep: 'gre']
    ExamOptions -->|SAT| Exam2[examPrep: 'sat']
    ExamOptions -->|TOEFL| Exam3[examPrep: 'toefl']
    ExamOptions -->|IELTS| Exam4[examPrep: 'ielts']
    ExamOptions -->|ACT| Exam5[examPrep: 'act']
    ExamOptions -->|Skip| Exam6[examPrep: null]
    
    Exam1 & Exam2 & Exam3 & Exam4 & Exam5 & Exam6 --> GetAuth[Get Auth User Info]
    GetAuth --> |email, username| BuildProfile[Build Profile Data]
    
    BuildProfile --> CheckPlatform{Platform?}
    CheckPlatform -->|Web| WebNotif[Skip Notifications<br/>channels: empty array]
    CheckPlatform -->|Native| NativeNotif[Request Push Permission<br/>Get Expo Push Token]
    
    WebNotif & NativeNotif --> SaveProfile["PUT /user/profile"]
    SaveProfile --> Lambda[user-preferences Lambda]
    Lambda --> ExtractClaims[Extract Cognito Claims<br/>userId, email, name]
    Lambda --> CreateProfile[Create Default Profile in DB]
    CreateProfile --> DynamoDB[(DynamoDB Users Table)]
    DynamoDB --> Success[Profile Created]
    Success --> Navigate([Navigate to Main App])
```

---

## Daily Word Flow (With Points & Membership)

```mermaid
sequenceDiagram
    participant U as User
    participant TS as Today Screen
    participant API as API Gateway
    participant L as get-todays-word Lambda
    participant FP as feedback-processor Lambda
    participant Users as DynamoDB Users
    participant Words as DynamoDB Daily Words
    participant Feedback as DynamoDB Feedback
    participant AI as Groq AI
    participant Img as Unsplash API
    participant Sec as Secrets Manager

    U->>TS: 1. Open Today Tab
    TS->>TS: 2. Load cached user profile
    TS->>API: 3. GET /word/today (with JWT)
    API->>L: 4. Invoke Lambda with Cognito claims
    
    L->>L: 5. Extract userId from claims
    L->>Words: 6. Query today's word for user
    
    alt Word exists for today
        Words-->>L: 7a. Return word + progress
        L->>L: 8a. Check if image exists
        alt No image URL
            L->>Sec: 9a. Get Unsplash API key
            Sec-->>L: 10a. API key
            L->>Img: 11a. Search for word image
            Img-->>L: 12a. Image URL
            L->>Words: 13a. Update word with imageUrl
        end
        L-->>API: 14a. Return word data
    else No word for today
        L->>L: 7b. Check user preferences
        L->>Sec: 8b. Get Groq API key
        Sec-->>L: 9b. API key
        L->>AI: 10b. Generate word based on context
        AI-->>L: 11b. Word + definition + examples
        L->>Sec: 12b. Get Unsplash API key
        Sec-->>L: 13b. API key
        L->>Img: 14b. Search for word image
        Img-->>L: 15b. Image URL
        L->>Words: 16b. Store new word
        Words-->>L: 17b. Success
        L-->>API: 18b. Return new word
    end
    
    API-->>TS: 15. Word data with image
    TS->>TS: 16. Display word, definition, image
    TS->>TS: 17. Show practice buttons
    
    U->>TS: 18. Mark as "Easy/Medium/Hard"
    TS->>API: 19. POST /feedback
    API->>FP: 20. feedback-processor Lambda
    FP->>Feedback: 21. Store feedback entry
    FP->>Words: 22. Update word practice status
    FP->>Users: 23. Increment pointsTotal (+1000)
    FP->>Users: 24. Recompute membershipLevel (Silver/Gold/Platinum/Diamond)
    Users-->>FP: 25. Updated points + membership
    FP-->>API: 26. Return reward {pointsAdded, pointsTotal, levelChanged, membershipLevel}
    API-->>TS: 27. Reward payload
    TS->>TS: 28. Show toast for points + membership badge update
```

---

## User Profile Management

```mermaid
flowchart TD
    Start([User Opens Profile Screen]) --> LoadProfile[Load Profile]
    
    LoadProfile --> GetAuthUser[Get Auth User from Context]
    GetAuthUser --> APICall["GET /user/profile with JWT"]
    
    APICall --> Lambda[user-preferences Lambda]
    Lambda --> ExtractClaims[Extract Cognito Claims<br/>userId, email, name]
    
    ExtractClaims --> CheckFields{Name fields available?}
    CheckFields -->|Try all fields| Fields[name, given_name, cognito:username,<br/>preferred_username, username, nickname]
    Fields --> Found{Found name?}
    Found -->|No| ExtractEmail[Extract from email<br/>name = email.split('@')[0]]
    Found -->|Yes| UseName[Use found name]
    ExtractEmail --> UseName
    
    UseName --> QueryDB[Query DynamoDB for user]
    QueryDB --> Exists{Profile exists?}
    
    Exists -->|No| CreateDefault[Create Default Profile<br/>userId, email, name, username,<br/>ageGroup: 'adult', context: 'general']
    CreateDefault --> SaveDB[Save to DynamoDB]
    SaveDB --> ReturnNew[Return new profile]
    
    Exists -->|Yes| MergeCognito[Merge with Cognito data<br/>Prioritize: Cognito > DB > Email > Default]
    MergeCognito --> UpdateMissing{Email or name missing?}
    UpdateMissing -->|Yes| UpdateDB[Update profile in DB]
    UpdateMissing -->|No| ReturnExisting[Return existing profile]
    UpdateDB --> ReturnExisting
    
    ReturnNew & ReturnExisting --> DisplayProfile[Display on Profile Screen]
    
    DisplayProfile --> UserEdit[User Edits Profile]
    UserEdit --> UpdateAPI["PUT /user/profile"]
    UpdateAPI --> UpdateLambda[user-preferences Lambda]
    UpdateLambda --> ValidateData[Validate & merge data<br/>Cognito claims > Body > Existing]
    ValidateData --> SaveUpdate[Save updated profile]
    SaveUpdate --> Success([Profile Updated])

    subgraph "Profile Data Structure"
        PD[Profile Object]
        PD --> PD1[userId: UUID]
        PD --> PD2[email: string]
        PD --> PD3[name: string display name]
        PD --> PD4[username: same as name NOT userId]
        PD --> PD5[ageGroup: enum]
        PD --> PD6[context: enum]
        PD --> PD7[examPrep: string/null]
        PD --> PD8[notificationPreferences: object]
        PD --> PD9[contactInfo: object]
        PD --> PD10[learningPatterns: object]
    end
```

---

## Backend Lambda Functions

### Lambda Function Map

```mermaid
graph LR
    subgraph "Lambda Functions"
        L1[get-todays-word<br/>Handler: index.js]
        L2[user-preferences<br/>Handler: index.js<br/>GET & PUT]
        L3[submit-feedback<br/>Handler: index.js]
        L4[get-history<br/>Handler: index.js]
        L5[ai-word-generation<br/>Helper function]
    end

    subgraph "API Gateway Routes"
        R1["GET /word/today"]
        R2["GET /user/profile"]
        R3["PUT /user/profile"]
        R4["POST /feedback"]
        R5["GET /history"]
    end

    subgraph "DynamoDB Tables"
        T1[onewordaday-users-production]
        T2[onewordaday-words-production]
        T3[onewordaday-feedback-production]
    end

    subgraph "External Services"
        E1[AWS Secrets Manager]
        E2[Groq AI API]
        E3[Unsplash Image API]
    end

    R1 --> L1
    R2 --> L2
    R3 --> L2
    R4 --> L3
    R5 --> L4

    L1 --> T2 & E1 & E2 & E3
    L2 --> T1 & E1
    L3 --> T3
    L4 --> T2
    L1 --> L5
```

### User Preferences Lambda (Detailed)

```mermaid
flowchart TD
    Start([Lambda Invoked]) --> Step1[STEP 1: Handler Triggered<br/>Log event]
    
    Step1 --> Step2[STEP 2: Extract Cognito Claims]
    Step2 --> ParseClaims[Parse requestContext.authorizer.claims]
    ParseClaims --> ExtractFields[Extract: sub userId, email<br/>Try name fields in order]
    
    ExtractFields --> NameLoop{Try name fields}
    NameLoop -->|Loop| TryFields[name, given_name, cognito:username,<br/>preferred_username, username, nickname]
    TryFields --> FoundName{Found?}
    FoundName -->|No| TryEmail[Extract from email]
    FoundName -->|Yes| SetName[Set name variable]
    TryEmail --> SetName
    
    SetName --> ValidateUserId{userId exists?}
    ValidateUserId -->|No| Error401[Return 401 Unauthorized]
    ValidateUserId -->|Yes| Step3[STEP 3: Determine HTTP Method]
    
    Step3 --> CheckMethod{Method?}
    CheckMethod -->|GET| GetProfile[Call getUserProfile]
    CheckMethod -->|PUT| UpdateProfile[Call updateUserProfile]
    CheckMethod -->|Other| Error405[Return 405 Method Not Allowed]
    
    GetProfile --> GetStep1[STEP 1: Query DynamoDB<br/>Key: userId]
    GetStep1 --> GetExists{Item exists?}
    
    GetExists -->|No| GetStep2A[STEP 2: Create Default Profile<br/>finalName = name or email prefix<br/>finalEmail = email]
    GetStep2A --> GetStep3A[STEP 3: Store in DynamoDB<br/>with default values]
    GetStep3A --> GetStep4A[STEP 4: Return 200<br/>isNew: true]
    
    GetExists -->|Yes| GetStep2B[STEP 2: Process Existing<br/>bestEmail = cognito or db<br/>bestName = cognito or db or email prefix]
    GetStep2B --> GetStep3B[STEP 3: Merge with Cognito data<br/>profile.email = bestEmail<br/>profile.name = bestName<br/>profile.username = bestName]
    GetStep3B --> GetStep4B{Missing data?}
    GetStep4B -->|Yes| GetUpdate[STEP 4: Update DB<br/>with merged data]
    GetStep4B -->|No| GetSkip[STEP 4: No update needed]
    GetUpdate & GetSkip --> GetStep5[STEP 5: Return 200<br/>with profile]
    
    UpdateProfile --> UpdStep1[STEP 1: Parse request body]
    UpdStep1 --> UpdStep2[STEP 2: Check existing user<br/>Query DynamoDB]
    UpdStep2 --> UpdExists{Exists?}
    UpdExists -->|No| UpdNew[isNewUser = true]
    UpdExists -->|Yes| UpdExisting[isNewUser = false]
    
    UpdNew & UpdExisting --> UpdStep3[STEP 3: Build final userData<br/>Priority: Cognito > Body > DB > Default]
    UpdStep3 --> UpdMerge[Merge all sources:<br/>bestEmail, bestName<br/>username = bestName NOT userId]
    UpdMerge --> UpdVerify[VERIFICATION:<br/>username === name?<br/>username !== userId?]
    UpdVerify --> UpdStep4[STEP 4: Store in DynamoDB<br/>PutCommand with merged data]
    UpdStep4 --> UpdStep5[STEP 5: Return 200<br/>with updated profile]
    
    GetStep4A & GetStep5 & UpdStep5 --> End([Return Response])
    
    Error401 & Error405 --> End
```

---

## Key Data Structures

### User Profile Structure
```json
{
  "userId": "uuid-v4-string",
  "email": "user@example.com",
  "name": "Display Name",
  "username": "Display Name (NOT userId)",
  "ageGroup": "adult|teen|young_adult|child|senior",
  "context": "school|college|corporate|business|exam_prep|general",
  "examPrep": "gre|sat|toefl|ielts|act|null",
  "notificationPreferences": {
    "dailyWord": {
      "enabled": true,
      "channels": ["push"],
      "time": "08:00",
      "timezone": "UTC"
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
    "expoPushToken": "string|null",
    "phoneNumber": "string|null"
  },
  "timezone": "UTC",
  "language": "en",
  "learningPatterns": {
    "totalWords": 0,
    "practicedWords": 0,
    "averageRating": 0,
    "difficultyPreference": "medium",
    "lastFeedbackDate": "ISO-8601"
  },
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601",
  "lastLoginAt": "ISO-8601"
}
```

### Word Structure
```json
{
  "userId": "uuid-v4-string",
  "wordId": "word-YYYY-MM-DD",
  "date": "YYYY-MM-DD",
  "word": "vocabulary",
  "definition": "string",
  "partOfSpeech": "noun|verb|adjective|...",
  "examples": ["example1", "example2", "example3"],
  "pronunciation": "string",
  "synonyms": ["word1", "word2"],
  "antonyms": ["word1", "word2"],
  "imageUrl": "https://...",
  "difficulty": "easy|medium|hard",
  "practiceStatus": "not_started|practicing|mastered",
  "practiceCount": 0,
  "lastPracticedAt": "ISO-8601|null",
  "createdAt": "ISO-8601"
}
```

---

## Frontend File Structure

```
app/
├── (auth)/                    # Authentication screens
│   ├── signin.tsx            # Sign in page
│   ├── signup.tsx            # Sign up page (name, email, password only)
│   ├── confirm.tsx           # Email confirmation with auto-signin
│   └── onboarding.tsx        # 3-step onboarding (age, context, exam)
│
├── (tabs)/                    # Main app tabs
│   ├── _layout.tsx           # Tab navigator
│   ├── index.tsx             # Today's word screen
│   ├── profile.tsx           # User profile management
│   ├── history.tsx           # Word history
│   └── feedback.tsx          # Submit feedback
│
contexts/
├── AuthContext.tsx           # Authentication state & functions
└── ToastContext.tsx          # Toast notifications

lib/
├── auth.ts                   # Auth functions (signUp, signIn, signOut, etc.)
├── api.ts                    # API client (axios)
└── aws-config.ts             # AWS Amplify configuration
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        Dev[Developer]
        DevCmd[npm run commands]
    end

    subgraph "Source Control"
        Git[Git Repository]
    end

    subgraph "Infrastructure as Code"
        TF[Terraform]
        TFModules[Terraform Modules]
    end

    subgraph "AWS Resources"
        Cog[Cognito User Pool]
        API[API Gateway]
        L[Lambda Functions]
        DB[DynamoDB Tables]
        S3[S3 Bucket]
        CF[CloudFront]
        SM[Secrets Manager]
        ACM[Certificate Manager]
    end

    subgraph "CI/CD Scripts"
        PS1[deploy-web.ps1]
        PS2[deploy-all.ps1]
        PS3[redeploy-lambda.ps1]
        PS4[cleanup-user.ps1]
    end

    subgraph "Web Hosting"
        Build[Expo Build - Web]
        Static[Static Files dist/]
    end

    Dev --> DevCmd
    DevCmd --> Git
    Git --> TF
    TF --> TFModules
    TFModules --> Cog & API & L & DB & SM
    
    Dev --> PS1 & PS2 & PS3
    PS1 --> Build
    Build --> Static
    Static --> S3
    S3 --> CF
    CF --> ACM
    
    PS2 & PS3 --> L
```

---

## Complete User Journey

```mermaid
journey
    title User Journey - One Word A Day
    section Sign Up
      Visit website: 5: User
      Enter details (name, email, password): 4: User
      Submit form: 5: User
      Receive confirmation email: 5: User, System
    section Confirm Email
      Enter 6-digit code: 4: User
      Auto sign-in: 5: System
      Navigate to onboarding: 5: System
    section Onboarding
      Select age group: 5: User
      Select context: 5: User
      Select exam prep (optional): 4: User
      Save profile: 5: System
      Navigate to main app: 5: System
    section Daily Usage
      See today's word: 5: User, System
      View image and definition: 5: User
      Read examples: 4: User
      Mark difficulty (Easy/Medium/Hard): 5: User
      View history: 4: User
    section Profile Management
      Update preferences: 4: User
      Change context or age group: 4: User
      Manage notifications: 3: User
      Sign out: 5: User
    section Return Visit
      Sign in with email/password: 5: User
      Or sign in with Google: 5: User, System
      See new word: 5: User, System
      Continue learning: 5: User
```

---

## Summary

### Key Components:
1. **Frontend**: Expo React Native (Web + Mobile)
2. **Authentication**: AWS Cognito (Email + Google OAuth)
3. **API**: AWS API Gateway (REST)
4. **Backend**: AWS Lambda (Node.js)
5. **Database**: DynamoDB
6. **AI**: Groq API
7. **Images**: Unsplash API
8. **Hosting**: S3 + CloudFront
9. **IaC**: Terraform

### Critical Flows:
1. **Signup → Confirm → Onboarding → Main App**
2. **Sign In → Main App (skip onboarding if profile exists)**
3. **Today Screen → Lambda → AI/DB → Display Word**
4. **Profile Management → Lambda → DynamoDB → Update**

### Data Priority:
**Username/Name handling:**
- **Cognito Claims** (highest priority)
- **Request Body** (from user input)
- **Existing DB Data**
- **Email Prefix** (fallback)
- **"User"** (final fallback)

**IMPORTANT**: `username` field always equals `name` (display name), NEVER equals `userId` (UUID)

