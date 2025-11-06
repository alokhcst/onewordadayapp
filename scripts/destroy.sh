#!/bin/bash

# One Word A Day - Destroy Script
# This script removes all AWS infrastructure

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}⚠️  WARNING: This will destroy all infrastructure!${NC}"
echo -e "${YELLOW}This action cannot be undone!${NC}"
echo ""

read -p "Are you sure you want to continue? Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
    echo "Destruction cancelled."
    exit 0
fi

echo ""
read -p "Please type 'destroy' to confirm again: " confirm2

if [ "$confirm2" != "destroy" ]; then
    echo "Destruction cancelled."
    exit 0
fi

echo -e "\n${RED}Destroying infrastructure...${NC}"

cd terraform
terraform destroy -auto-approve

echo -e "\n${RED}✓ Infrastructure destroyed${NC}"
echo -e "Don't forget to delete the .env file if you're done testing."

