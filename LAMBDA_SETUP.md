# Collage Lambda — one-time AWS setup

You only do this once. After this, every `git push` to `main` that changes
collage code auto-builds and deploys via `.github/workflows/deploy-lambda.yml`.

Region used throughout: `eu-west-1` (same as your EC2 + Secrets Manager).

## 1. Create the ECR repository

```bash
aws ecr create-repository \
  --repository-name yooz-collage-lambda \
  --region eu-west-1
```

## 2. Build & push the first image manually

The Lambda function needs an image to exist before you can create it.

```bash
# Login
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin \
    $(aws sts get-caller-identity --query Account --output text).dkr.ecr.eu-west-1.amazonaws.com

# Build + push
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
IMAGE=$ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/yooz-collage-lambda:bootstrap
docker build -f server/Dockerfile.lambda -t $IMAGE .
docker push $IMAGE
echo "Image: $IMAGE"
```

## 3. Create the Lambda execution role

```bash
cat > /tmp/lambda-trust.json <<'EOF'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}
EOF

aws iam create-role \
  --role-name yooz-collage-lambda-role \
  --assume-role-policy-document file:///tmp/lambda-trust.json

aws iam attach-role-policy \
  --role-name yooz-collage-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## 4. Create the Lambda function

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)

aws lambda create-function \
  --function-name yooz-collage \
  --package-type Image \
  --code ImageUri=$ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/yooz-collage-lambda:bootstrap \
  --role arn:aws:iam::$ACCOUNT:role/yooz-collage-lambda-role \
  --timeout 600 \
  --memory-size 3008 \
  --ephemeral-storage Size=2048 \
  --region eu-west-1
```

Sizing notes:
- `memory-size 3008` ≈ 2 full vCPUs (Lambda scales CPU with memory).
- `timeout 600` (10 min) is well over your 2-min encode — buffer for cold starts.
- `ephemeral-storage 2048` (2 GB `/tmp`) for tmp images + ffmpeg work.

## 5. Set Lambda env vars

```bash
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
SECRET=$(aws secretsmanager get-secret-value \
  --secret-id yooz/production --region eu-west-1 \
  --query SecretString --output text)

MONGO=$(echo "$SECRET" | python3 -c 'import sys,json;print(json.load(sys.stdin)["MONGODB_URI"])')
C_CLOUD=$(echo "$SECRET" | python3 -c 'import sys,json;print(json.load(sys.stdin)["CLOUDINARY_CLOUD_NAME"])')
C_KEY=$(echo "$SECRET" | python3 -c 'import sys,json;print(json.load(sys.stdin)["CLOUDINARY_API_KEY"])')
C_SECRET=$(echo "$SECRET" | python3 -c 'import sys,json;print(json.load(sys.stdin)["CLOUDINARY_API_SECRET"])')

aws lambda update-function-configuration \
  --function-name yooz-collage \
  --region eu-west-1 \
  --environment "Variables={MONGODB_URI=$MONGO,CLOUDINARY_CLOUD_NAME=$C_CLOUD,CLOUDINARY_API_KEY=$C_KEY,CLOUDINARY_API_SECRET=$C_SECRET}"
```

## 6. MongoDB Atlas network access

Lambda runs from random AWS IPs. Easiest:

- Atlas → Network Access → Add `0.0.0.0/0` (you may already have this for EC2).

If you want it tighter later, put Lambda in a VPC and use a NAT gateway with a
fixed IP — ~$32/month extra, not worth it for this scale.

## 7. Let EC2 invoke the Lambda

Add this inline policy to your EC2 instance role (or to the IAM user whose
keys are on EC2 via `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`):

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "lambda:InvokeFunction",
    "Resource": "arn:aws:lambda:eu-west-1:*:function:yooz-collage"
  }]
}
```

## 8. Tell the server the function name

Add to GitHub Secrets:

- `SM_COLLAGE_LAMBDA_FUNCTION_NAME` = `yooz-collage`

(The main deploy workflow auto-syncs `SM_*` secrets into AWS Secrets Manager,
which lands them in `/etc/yooz/prod.env`. The server picks it up on next
deploy.)

For local dev, add to your `.env`:
```
COLLAGE_LAMBDA_FUNCTION_NAME=yooz-collage
AWS_REGION=eu-west-1
AWS_ACCESS_KEY_ID=...    # an IAM user with lambda:InvokeFunction
AWS_SECRET_ACCESS_KEY=...
```

## 9. Smoke test

```bash
aws lambda invoke \
  --function-name yooz-collage \
  --region eu-west-1 \
  --payload "$(printf '{"jobId":"<an-existing-jobId>"}' | base64)" \
  --cli-binary-format raw-in-base64-out \
  /tmp/out.json
cat /tmp/out.json
aws logs tail /aws/lambda/yooz-collage --region eu-west-1 --since 5m
```

## How CI/CD works after this

- Push to `main` touching collage files → `.github/workflows/deploy-lambda.yml`
  builds image, pushes to ECR, `aws lambda update-function-code` swaps in the
  new image. ~3-5 min.
- Push to `main` touching anything else → the existing `deploy.yml` rsync's
  to EC2 + rebuilds. Unchanged.
- Both can run in parallel on the same commit — they target different infra.

## What to monitor

- Lambda `Errors` metric (CloudWatch) — alert on > 0 in a 5-min window.
- Lambda `Duration` p95 — should stay around 2 min. Spikes mean ffmpeg
  regression or cold start fleet.
- Lambda `ConcurrentExecutions` — default account limit is 1000. You'll see
  bursts of 50 during big activities — fine.

## Rollback

```bash
# Find a previous image
aws ecr list-images --repository-name yooz-collage-lambda --region eu-west-1

# Pin Lambda to it
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
aws lambda update-function-code \
  --function-name yooz-collage \
  --image-uri $ACCOUNT.dkr.ecr.eu-west-1.amazonaws.com/yooz-collage-lambda:<sha> \
  --region eu-west-1
```
