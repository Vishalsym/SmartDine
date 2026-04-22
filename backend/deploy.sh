#!/usr/bin/env bash
# ============================================================
# SmartDine — Full Deployment Script
# Usage: bash deploy.sh
# ============================================================
set -e

# ── Config (edit these) ──────────────────────────────────────
STACK_NAME="smartdine-stack"
REGION="ap-south-1"          # Mumbai — closest to Delhi
S3_BUCKET="smartdine-deploy-$(aws sts get-caller-identity --query Account --output text)"
SENDER_EMAIL=""               # Filled in by script prompt
ENVIRONMENT="prod"
FRONTEND_DIR="../smartdine-app"
# ────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║         SmartDine Deployment — AWS ap-south-1    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 0: Check tools ──────────────────────────────────────
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI not found. Install from https://aws.amazon.com/cli/"; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "❌ SAM CLI not found. Run: pip install aws-sam-cli"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found."; exit 1; }

echo "✅ Tools found"
echo ""

# ── Step 1: Get sender email ─────────────────────────────────
if [ -z "$SENDER_EMAIL" ]; then
  read -p "Enter your sender email for SES (must be one you own): " SENDER_EMAIL
fi

# ── Step 2: Verify SES email ─────────────────────────────────
echo ""
echo "📧 Verifying sender email in SES..."
aws ses verify-email-identity --email-address "$SENDER_EMAIL" --region "$REGION" 2>/dev/null || true
echo "   ⚠️  Check your inbox for $SENDER_EMAIL and click the verification link."
echo "   Press Enter once you've verified it (or if already verified)."
read -p ""

# ── Step 3: Create S3 bucket for SAM artifacts ───────────────
echo "🪣 Creating S3 bucket for deployment artifacts..."
aws s3 mb "s3://$S3_BUCKET" --region "$REGION" 2>/dev/null || echo "   (bucket already exists)"

# ── Step 4: SAM build ────────────────────────────────────────
echo ""
echo "🔨 Building Lambda functions with SAM..."
sam build --template template.yaml --region "$REGION"

# ── Step 5: SAM deploy ───────────────────────────────────────
echo ""
echo "🚀 Deploying to AWS ($REGION)..."
sam deploy \
  --stack-name "$STACK_NAME" \
  --s3-bucket "$S3_BUCKET" \
  --region "$REGION" \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --parameter-overrides \
    SenderEmail="$SENDER_EMAIL" \
    Environment="$ENVIRONMENT" \
  --no-fail-on-empty-changeset \
  --no-confirm-changeset

# ── Step 6: Get API endpoint from stack outputs ───────────────
echo ""
echo "📡 Fetching API Gateway endpoint..."
API_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" \
  --output text)

if [ -z "$API_ENDPOINT" ]; then
  echo "❌ Could not fetch API endpoint. Check CloudFormation console."
  exit 1
fi

echo "   API Endpoint: $API_ENDPOINT"

# ── Step 7: Write frontend .env.local ────────────────────────
echo ""
echo "⚙️  Writing frontend environment config..."
cat > "$FRONTEND_DIR/.env.local" <<EOF
VITE_API_ENDPOINT=$API_ENDPOINT
EOF
echo "   Written to $FRONTEND_DIR/.env.local"

# ── Step 8: Build frontend ───────────────────────────────────
echo ""
echo "🏗️  Building React frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

cd -

# ── Done ─────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ✅  SmartDine deployed successfully!                    ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  API Endpoint:  $API_ENDPOINT"
echo "║                                                          ║"
echo "║  Frontend build: $FRONTEND_DIR/dist/                    ║"
echo "║                                                          ║"
echo "║  Next steps:                                             ║"
echo "║  1. Host the dist/ folder (S3 static site, Vercel, etc) ║"
echo "║  2. Test a booking — check email + SMS both arrive       ║"
echo "║  3. Set a favourite — verify Monday auto-booking fires   ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""
