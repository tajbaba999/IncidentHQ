# AWS Deployment Guide

## Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** >= 1.0 installed
3. **Docker** installed (for building images)
4. An existing **Route53 hosted zone** in your AWS account

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS Cloud                              │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   ALB       │───▶│  ECS Fargate │───│    RDS      │     │
│  │ (api.domain)│    │  (API/Worker)│    │ PostgreSQL  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                  │                                 │
│         ▼                  ▼                                 │
│  ┌─────────────┐    ┌─────────────┐                         │
│  │  Route53    │    │ CloudWatch  │                         │
│  │  (DNS)      │    │  (Logs)     │                         │
│  └─────────────┘    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Get Your Hosted Zone ID

```bash
# List your hosted zones
aws route53 list-hosted-zones
```

### 2. Create terraform.tfvars

Create `terraform/environments/prod/terraform.tfvars`:

```hcl
aws_region          = "us-east-1"
environment         = "prod"

# RDS Configuration
db_master_password  = "your-secure-password"

# Domain Configuration (UPDATE THIS)
domain_name         = "api.yourdomain.com"
hosted_zone_id      = "YOUR-ROUT53-ZONE-ID"

# Optional: SQS
sqs_queue_url       = "https://sqs.us-east-1.amazonaws.com/123456789012/pulseping"

# Secrets (UPDATE THIS)
clerk_secret_key    = "sk_live_xxx"
```

### 3. Initialize Terraform

```bash
cd terraform/environments/prod
terraform init
```

### 4. Plan Deployment

```bash
terraform plan -out=tfplan
```

### 5. Apply

```bash
terraform apply tfplan
```

## Deployment Steps

### Step 1: Build & Push Docker Images to ECR

```bash
# Get ECR login token
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Build and push API image
docker build -t pulseping-api services/api
docker tag pulseping-api:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulseping-api:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulseping-api:latest

# Build and push Worker image
docker build -t pulseping-worker services/worker
docker tag pulseping-worker:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulseping-worker:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/pulseping-worker:latest
```

### Step 2: Deploy Infrastructure

```bash
cd terraform/environments/prod
terraform apply
```

## Infrastructure Created

| Resource | Description |
|----------|-------------|
| VPC | 10.0.0.0/16 with 3 AZs |
| ECS Cluster | Fargate cluster |
| RDS PostgreSQL | db.t3.micro, 20GB |
| ALB | Application Load Balancer |
| Route53 Record | DNS A record for API |
| CloudWatch Logs | Log groups for containers |
| Secrets Manager | Clerk API key storage |

## Post-Deployment

### Check ECS Services

```bash
aws ecs list-services --cluster pulseping-prod-cluster
```

### View Logs

```bash
# API logs
aws logs tail /ecs/pulseping-api --follow

# Worker logs
aws logs tail /ecs/pulseping-worker --follow
```

### Test API

```bash
curl https://api.yourdomain.com/health
```

## Troubleshooting

### ECS Tasks Not Starting

Check task definitions and security groups:
```bash
aws ecs describe-tasks --cluster pulseping-prod-cluster --tasks <task-id>
```

### Database Connection Issues

Check RDS security group allows ECS tasks:
```bash
aws rds describe-db-instances --db-instance-identifier pulseping-prod-db
```

### SSL Certificate Issues

DNS validation for ACM certificate:
```bash
aws acm describe-certificate --certificate-arn <arn>
```

## Cleanup

```bash
terraform destroy
```

## Cost Estimate

- ECS Fargate (2 tasks each): ~$30/month
- RDS db.t3.micro: ~$15/month
- ALB: ~$25/month
- Data transfer: ~$5/month

**Total: ~$75/month**