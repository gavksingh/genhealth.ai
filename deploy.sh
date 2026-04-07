#!/bin/bash
set -e

# Load GCP config
if [ ! -f .gcp-config ]; then
    echo "ERROR: .gcp-config not found. Run the init prompt first."
    exit 1
fi
source .gcp-config

SA_NAME="genhealth-sa"
SA_EMAIL="${SA_NAME}@${GCP_PROJECT_ID}.iam.gserviceaccount.com"

echo "========================================="
echo "Deploying $SERVICE_NAME to GCP Cloud Run"
echo "Project:  $GCP_PROJECT_ID"
echo "Region:   $GCP_REGION"
echo "Registry: $GCP_REGISTRY"
echo "========================================="

# Ensure service account exists with Vertex AI access
echo "[0/4] Ensuring service account and IAM roles..."
gcloud iam service-accounts create "${SA_NAME}" \
  --display-name="GenHealth Assessment SA" \
  --project="${GCP_PROJECT_ID}" \
  --quiet 2>/dev/null || true

gcloud projects add-iam-policy-binding "${GCP_PROJECT_ID}" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user" \
  --quiet > /dev/null

# Build
echo "[1/4] Building Docker image..."
docker build --platform linux/amd64 -t $GCP_REGISTRY/$GCP_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG .

# Push
echo "[2/4] Pushing to registry..."
docker push $GCP_REGISTRY/$GCP_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG

# Deploy
echo "[3/4] Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $GCP_REGISTRY/$GCP_PROJECT_ID/$SERVICE_NAME:$IMAGE_TAG \
  --platform managed \
  --region $GCP_REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 3 \
  --set-env-vars "ENVIRONMENT=production,GOOGLE_CLOUD_PROJECT=$GCP_PROJECT_ID,GCP_REGION=$GCP_REGION" \
  --service-account "${SA_EMAIL}" \
  --project $GCP_PROJECT_ID \
  --quiet

# Get URL
echo "[4/4] Getting live URL..."
LIVE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $GCP_REGION \
  --project $GCP_PROJECT_ID \
  --format "value(status.url)")

echo ""
echo "========================================="
echo "DEPLOYED SUCCESSFULLY"
echo "Live URL: $LIVE_URL"
echo "API Docs: $LIVE_URL/docs"
echo "Health:   $LIVE_URL/health"
echo "========================================="

# Verify
echo ""
echo "Verifying deployment..."
curl -s "$LIVE_URL/health" | python3 -m json.tool
echo ""
echo "DONE."
