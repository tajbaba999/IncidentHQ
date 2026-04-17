variable "environment" {
  description = "Environment name"
  type        = string
}

variable "project" {
  description = "Project name"
  type        = string
}

variable "vpc_id" {
  description = "VPC ID"
  type        = string
}

variable "subnet_ids" {
  description = "Database subnet IDs"
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs"
  type        = list(string)
}

variable "database_name" {
  description = "Database name"
  type        = string
  default     = "pulseping"
}

variable "db_instance_class" {
  description = "DB instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_master_username" {
  description = "Master username"
  type        = string
  default     = "pulseping"
}

variable "db_master_password" {
  description = "Master password"
  type        = string
  sensitive   = true
}

variable "backup_retention_days" {
  description = "Backup retention days"
  type        = number
  default     = 7
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.environment}-db-subnet-group"
  subnet_ids = var.subnet_ids

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-db-subnet-group"
  })
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-${var.environment}-db"
  engine         = "postgres"
  engine_version = "16.1"
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 2
  storage_encrypted     = true
  storage_type          = "gp3"

  db_name  = var.database_name
  username = var.db_master_username
  password = var.db_master_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = var.security_group_ids

  backup_retention_period = var.backup_retention_days
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  deletion_protection = false

  skip_final_snapshot       = true
  final_snapshot_identifier = "${var.project}-${var.environment}-final-snapshot"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-db"
  })
}

output "database_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}

output "database_name" {
  value = var.database_name
}