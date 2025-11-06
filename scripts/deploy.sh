#!/bin/bash

# One Word A Day - Deployment Script
# This script deploys the complete application to AWS

set -e

echo "🚀 Starting One Word A Day deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All prerequisites met${NC}"

# Build Lambda functions
echo -e "\n${YELLOW}Building Lambda functions...${NC}"
cd backend
npm install
npm run build
cd ..
echo -e "${GREEN}✓ Lambda functions built${NC}"

# Create layer directory if it doesn't exist
if [ ! -d "backend/layers" ]; then
    mkdir -p backend/layers
fi

# Create Lambda layer with dependencies
echo -e "\n${YELLOW}Creating Lambda layer...${NC}"
if [ ! -f "backend/layers/dependencies.zip" ]; then
    mkdir -p backend/layers/nodejs
    cd backend/layers/nodejs
    npm init -y
    npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb @aws-sdk/client-s3 @aws-sdk/client-sns @aws-sdk/client-ses @aws-sdk/client-bedrock-runtime @aws-sdk/client-secrets-manager axios uuid
    cd ..
    zip -r dependencies.zip nodejs
    rm -rf nodejs
    cd ../..
    echo -e "${GREEN}✓ Lambda layer created${NC}"
else
    echo -e "${GREEN}✓ Lambda layer already exists${NC}"
fi

# Initialize Terraform
echo -e "\n${YELLOW}Initializing Terraform...${NC}"
cd terraform
terraform init
echo -e "${GREEN}✓ Terraform initialized${NC}"

# Validate Terraform configuration
echo -e "\n${YELLOW}Validating Terraform configuration...${NC}"
terraform validate
echo -e "${GREEN}✓ Terraform configuration valid${NC}"

# Plan Terraform deployment
echo -e "\n${YELLOW}Planning Terraform deployment...${NC}"
terraform plan -out=tfplan
echo -e "${GREEN}✓ Terraform plan created${NC}"

# Apply Terraform deployment
echo -e "\n${YELLOW}Applying Terraform deployment...${NC}"
read -p "Do you want to proceed with deployment? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${RED}❌ Deployment cancelled${NC}"
    exit 0
fi

terraform apply tfplan
echo -e "${GREEN}✓ Infrastructure deployed${NC}"

# Get outputs
echo -e "\n${YELLOW}Retrieving deployment outputs...${NC}"
USER_POOL_ID=$(terraform output -raw cognito_user_pool_id)
CLIENT_ID=$(terraform output -raw cognito_client_id)
API_URL=$(terraform output -raw api_gateway_url)
CLOUDFRONT_DOMAIN=$(terraform output -raw cloudfront_domain)

cd ..

# Create .env file for frontend
echo -e "\n${YELLOW}Creating frontend .env file...${NC}"
cat > .env << EOF
EXPO_PUBLIC_USER_POOL_ID=$USER_POOL_ID
EXPO_PUBLIC_USER_POOL_CLIENT_ID=$CLIENT_ID
EXPO_PUBLIC_API_ENDPOINT=$API_URL
EOF

echo -e "${GREEN}✓ Frontend .env file created${NC}"

# Display summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "📋 Deployment Details:"
echo -e "  User Pool ID: ${YELLOW}$USER_POOL_ID${NC}"
echo -e "  Client ID: ${YELLOW}$CLIENT_ID${NC}"
echo -e "  API URL: ${YELLOW}$API_URL${NC}"
echo -e "  CloudFront Domain: ${YELLOW}$CLOUDFRONT_DOMAIN${NC}"
echo ""
echo -e "📱 Next Steps:"
echo -e "  1. Update Google OAuth redirect URIs in Google Cloud Console"
echo -e "  2. Verify SES email identity (noreply@yourdomain.com)"
echo -e "  3. Populate word bank using the content enrichment function"
echo -e "  4. Run: ${YELLOW}npm install${NC} to install frontend dependencies"
echo -e "  5. Run: ${YELLOW}npx expo start${NC} to start the app"
echo ""

