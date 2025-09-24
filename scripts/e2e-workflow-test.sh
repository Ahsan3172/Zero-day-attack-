#!/bin/bash

# End-to-End Workflow Test
# Tests the complete workflow from data upload to prediction

echo "Starting End-to-End Workflow Test..."

API_URL="http://test-api:8000"
BACKEND_URL="http://test-backend:5000"

# 1. Health Check
echo "1. Checking service health..."
curl -f "$API_URL/health" || exit 1
curl -f "$BACKEND_URL/api/health" || exit 1

# 2. Upload Dataset
echo "2. Testing dataset upload..."
cat > test_dataset.csv << EOF
feature1,feature2,feature3,feature4,feature5,label
1.0,2.0,3.0,4.0,5.0,0
6.0,7.0,8.0,9.0,10.0,1
11.0,12.0,13.0,14.0,15.0,0
16.0,17.0,18.0,19.0,20.0,1
EOF

UPLOAD_RESPONSE=$(curl -s -X POST "$API_URL/data/upload" \
  -F "file=@test_dataset.csv")

if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Dataset upload successful"
else
    echo "✗ Dataset upload failed"
    exit 1
fi

# 3. List Models
echo "3. Testing model listing..."
MODELS_RESPONSE=$(curl -s "$API_URL/models/list")

if echo "$MODELS_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Model listing successful"
else
    echo "✗ Model listing failed"
    exit 1
fi

# 4. Make Prediction
echo "4. Testing prediction..."
PREDICTION_RESPONSE=$(curl -s -X POST "$API_URL/predictions/predict-single" \
  -H "Content-Type: application/json" \
  -d '{
    "features": [1.0, 2.0, 3.0, 4.0, 5.0],
    "model": "random_forest"
  }')

if echo "$PREDICTION_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Prediction successful"
else
    echo "✗ Prediction failed"
    exit 1
fi

# 5. Batch Prediction
echo "5. Testing batch prediction..."
BATCH_RESPONSE=$(curl -s -X POST "$API_URL/predictions/predict" \
  -F "file=@test_dataset.csv" \
  -F "model=random_forest")

if echo "$BATCH_RESPONSE" | grep -q '"success":true'; then
    echo "✓ Batch prediction successful"
else
    echo "✗ Batch prediction failed"
    exit 1
fi

# Cleanup
rm -f test_dataset.csv

echo "✅ End-to-End Workflow Test completed successfully!"