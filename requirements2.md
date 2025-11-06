ADD AI feature

Re write code to add AI Based vocabulary word creation using context (Age Group, Context, Exam Prep (Optional), custom prompt) 
using below tools

1> AWS Lambda Function
• Parse user context (Age Group, Context, Exam Prep (Optional), custom prompt) 
• Build LLM prompt template
• Route to appropriate LLM service
• Process & format response

2> LLM Selection Router
Selects best available free LLM based on load & availability

3> calling Groq Cloud
Free Tier:
Very fast inference
Llama 3, Mixtral

Response Processor
• Extract vocabulary word
• Format definition
• Generate example sentence
• Add pronunciation guide

Security:
API keys stored in AWS Secrets Manager
IAM roles for service permissions
HTTPS only, API authentication required

Monitoring:
CloudWatch for logs & metrics
Track LLM usage per provider
Alert on rate limit approaching of 20 words a day

Cost Optimization:
Use free tiers first, fallback to paid
Cache common requests in DynamoDB
Implement rate limiting per user

