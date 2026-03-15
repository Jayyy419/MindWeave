# AWS Redeploy Guide (CLI)

This runbook is the command-first deployment method for MindWeave.

## Deployment Targets
- Backend: Elastic Beanstalk environment mindweave-backend-prod
- Frontend: S3 bucket mindweave-frontend-140023398409-20260315213625
- CDN: CloudFront distribution E1IH3MH6OBUQU

---

## 1. Preflight

```powershell
aws sts get-caller-identity
aws elasticbeanstalk describe-environments --application-name mindweave-backend --environment-names mindweave-backend-prod --query "Environments[0].[Status,Health,VersionLabel]" --output table
```

Expected before deploy:
- Environment status Ready
- Environment health Green

---

## 2. Backend Redeploy (Beanstalk)

```powershell
Set-Location backend
npm install
npm run build

$VERSION = "v$(Get-Date -Format 'yyyyMMddHHmmss')"
$BUCKET = aws --no-cli-pager elasticbeanstalk create-storage-location --query S3Bucket --output text
$ZIP_PATH = "..\backend-deploy-$VERSION.zip"

if (Test-Path $ZIP_PATH) { Remove-Item $ZIP_PATH -Force }
tar -a -c -f $ZIP_PATH package.json package-lock.json tsconfig.json src prisma dist

aws --no-cli-pager s3 cp $ZIP_PATH "s3://$BUCKET/backend-deploy-$VERSION.zip"
aws --no-cli-pager elasticbeanstalk create-application-version --application-name mindweave-backend --version-label $VERSION --source-bundle S3Bucket=$BUCKET,S3Key=backend-deploy-$VERSION.zip
aws --no-cli-pager elasticbeanstalk update-environment --environment-name mindweave-backend-prod --version-label $VERSION
```

Wait for Ready/Green:

```powershell
aws --no-cli-pager elasticbeanstalk describe-environments --application-name mindweave-backend --environment-names mindweave-backend-prod --query "Environments[0].[Status,Health,VersionLabel]" --output table
```

---

## 3. Frontend Redeploy (S3 + CloudFront)

```powershell
Set-Location ..\frontend
npm install
$env:VITE_API_BASE_URL = "/api"
npm run build

aws --no-cli-pager s3 sync dist/ s3://mindweave-frontend-140023398409-20260315213625/ --delete
$invId = aws --no-cli-pager cloudfront create-invalidation --distribution-id E1IH3MH6OBUQU --paths "/*" --query "Invalidation.Id" --output text
$invId
```

Check invalidation status:

```powershell
aws --no-cli-pager cloudfront get-invalidation --distribution-id E1IH3MH6OBUQU --id <INVALIDATION_ID> --query "Invalidation.Status" --output text
```

---

## 4. Production Schema Sync (Prisma)

Only needed if schema changed.

```powershell
Set-Location ..\backend
$secretRaw = aws --no-cli-pager secretsmanager get-secret-value --secret-id mindweave/prod/app --query SecretString --output text
$secretObj = $secretRaw | ConvertFrom-Json
$env:DATABASE_URL = $secretObj.DATABASE_URL

npx prisma db push --skip-generate
```

If your current IP is blocked by DB SG, temporarily authorize and revoke:

```powershell
$dbSg = "sg-03f94675295dac4af"
$myIp = (Invoke-RestMethod -Uri "https://checkip.amazonaws.com").Trim()
$cidr = "$myIp/32"

aws --no-cli-pager ec2 authorize-security-group-ingress --group-id $dbSg --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=$cidr,Description='temporary-prisma-db-push'}]"

# run prisma db push here

aws --no-cli-pager ec2 revoke-security-group-ingress --group-id $dbSg --ip-permissions "IpProtocol=tcp,FromPort=5432,ToPort=5432,IpRanges=[{CidrIp=$cidr}]"
```

---

## 5. Environment Variables for Password Reset

Set in Beanstalk:
- FRONTEND_BASE_URL=https://d1n2io4499e5zf.cloudfront.net
- SMTP_HOST
- SMTP_PORT
- SMTP_USER
- SMTP_PASS
- SMTP_FROM

Update via CLI:

```powershell
aws --no-cli-pager elasticbeanstalk update-environment --environment-name mindweave-backend-prod --option-settings Namespace=aws:elasticbeanstalk:application:environment,OptionName=FRONTEND_BASE_URL,Value=https://d1n2io4499e5zf.cloudfront.net
```

Repeat with separate OptionName entries for SMTP variables.

---

## 6. Verification

```powershell
Invoke-RestMethod -Uri "https://d1n2io4499e5zf.cloudfront.net/api/health" -Method GET
```

Expected:
- status = ok

Quick smoke:
- Register user
- Login
- Fetch thinktanks
- Trigger forgot-password for existing email

---

## 7. Rollback

## Backend rollback
- Get previous version labels:

```powershell
aws elasticbeanstalk describe-application-versions --application-name mindweave-backend --query "ApplicationVersions[].VersionLabel" --output table
```

- Deploy previous stable label:

```powershell
aws elasticbeanstalk update-environment --environment-name mindweave-backend-prod --version-label <PREVIOUS_LABEL>
```

## Frontend rollback
- Re-upload previous dist artifact if available.
- Invalidate CloudFront again with path /*.
