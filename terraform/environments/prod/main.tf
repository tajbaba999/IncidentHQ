terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "pulseping-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "pulseping"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = var.aws_region

  ecr_api_url    = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/pulseping-api"
  ecr_worker_url = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/pulseping-worker"

  tags = {
    Project     = "pulseping"
    Environment = var.environment
  }
}

module "vpc" {
  source = "./modules/vpc"

  environment = var.environment
  project     = "pulseping"

  availability_zones = var.availability_zones

  cidr_block            = var.vpc_cidr
  public_subnet_cidrs   = var.public_subnet_cidrs
  private_subnet_cidrs  = var.private_subnet_cidrs
  database_subnet_cidrs = var.database_subnet_cidrs

  tags = local.tags
}

module "rds" {
  source = "./modules/rds"

  environment = var.environment
  project     = "pulseping"

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.database_subnet_ids
  security_group_ids = [module.vpc.rds_security_group_id]

  database_name        = var.database_name
  db_instance_class    = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_master_username   = var.db_master_username
  db_master_password   = var.db_master_password

  backup_retention_days = var.backup_retention_days

  tags = local.tags
}

module "ecs" {
  source = "./modules/ecs"

  environment = var.environment
  project     = "pulseping"

  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  security_group_ids = [module.vpc.ecs_security_group_id]

  ecr_api_image_uri    = local.ecr_api_url
  ecr_worker_image_uri = local.ecr_worker_url

  database_url = module.rds.database_endpoint

  aws_region       = local.region
  sqs_queue_url    = var.sqs_queue_url
  clerk_secret_key = var.clerk_secret_key
  log_level        = var.log_level

  desired_count_api    = var.api_desired_count
  desired_count_worker = var.worker_desired_count

  tags = local.tags
}

module "alb" {
  source = "./modules/alb"

  environment = var.environment
  project     = "pulseping"

  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.public_subnet_ids
  security_group_ids = [module.vpc.alb_security_group_id]

  ecs_service_api_name     = module.ecs.api_service_name
  ecs_api_target_group_arn = module.ecs.api_target_group_arn

  domain_name    = var.domain_name
  hosted_zone_id = var.hosted_zone_id

  tags = local.tags
}

module "logging" {
  source = "./modules/logging"

  environment = var.environment
  project     = "pulseping"

  ecs_cluster_name = module.ecs.cluster_name

  log_retention_days = var.log_retention_days

  tags = local.tags
}

output "api_url" {
  value = "https://${var.domain_name}"
}

output "database_endpoint" {
  value = module.rds.database_endpoint
}

output "ecs_cluster_name" {
  value = module.ecs.cluster_name
}

output "s3_bucket_name" {
  value = "pulseping-${var.environment}-${local.account_id}"
}