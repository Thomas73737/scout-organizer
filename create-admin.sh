#!/bin/bash

# Script to create the sofsafaSVS admin account
# Usage: ./create-admin.sh

echo "Creating sofsafaSVS admin account..."

# Call the API to create the admin account
curl -X POST http://localhost:5000/api/users/create-admin \
  -H "Content-Type: application/json" \
  -d '{
    "name": "sofsafaSVS",
    "email": "admin@scout.org",
    "password": "admin123"
  }'

echo ""
echo "If successful, you can now login with:"
echo "Username: sofsafaSVS"
echo "Password: admin123"
echo ""
echo "Please change the password after first login!"