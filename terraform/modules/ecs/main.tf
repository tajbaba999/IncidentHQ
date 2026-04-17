variable "environment" { type = string }
variable "project" { type = string }
variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "ecr_api_image_uri" { type = string }
variable "ecr_worker_image_uri" { type = string }
variable "database_url" { type = string }
variable "aws_region" { type = string }
variable "sqs_queue_url" { type = string default = "" }
variable "clerk_secret_key" { type = string }
variable "log_level" { type = string default = "info" }
variable "desired_count_api" { type = number default = 2 }
variable "desired_count_worker" { type = number default = 2 }
variable "tags" { type = map(string) default = {} }

resource "aws_ecs_cluster" "main" {
  name = "${var.project}-${var.environment}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  
  tags = var.tags
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${var.project}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name      = "api"
      image     = var.ecr_api_image_uri
      essential = true
      portMappings = [{
        containerPort = 3000
        protocol      = "tcp"
      }]
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "PORT", value = "3000" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "SQS_QUEUE_URL", value = var.sqs_queue_url },
        { name = "LOG_LEVEL", value = var.log_level }
      ]
      secrets = [
        { name = "CLERK_SECRET_KEY", valueFrom = aws_secretsmanager_secret.clerk_secret.arn }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project}-api"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  
  tags = var.tags
}

resource "aws_ecs_task_definition" "worker" {
  family                   = "${var.project}-worker"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn
  
  container_definitions = jsonencode([
    {
      name      = "worker"
      image     = var.ecr_worker_image_uri
      essential = true
      environment = [
        { name = "NODE_ENV", value = "production" },
        { name = "DATABASE_URL", value = var.database_url },
        { name = "AWS_REGION", value = var.aws_region },
        { name = "SQS_QUEUE_URL", value = var.sqs_queue_url },
        { name = "LOG_LEVEL", value = var.log_level }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/${var.project}-worker"
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
  
  tags = var.tags
}

resource "aws_ecs_service" "api" {
  name            = "${var.project}-api-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = var.desired_count_api
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
  
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }
  
  depends_on = [aws_lb_target_group.api]
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  tags = var.tags
}

resource "aws_ecs_service" "worker" {
  name            = "${var.project}-worker-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.worker.arn
  desired_count   = var.desired_count_worker
  launch_type     = "FARGATE"
  
  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }
  
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }
  
  tags = var.tags
}

resource "aws_lb_target_group" "api" {
  name     = "${var.project}-api-tg"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = var.vpc_id
  
  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    timeout             = 5
    interval            = 30
    path                = "/health"
    matcher             = "200"
  }
  
  tags = var.tags
}

resource "aws_iam_role" "ecs_execution_role" {
  name = "${var.project}-ecs-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_role_policy" {
  role       = aws_iam_role.ecs_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project}-ecs-task-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ecs-tasks.amazonaws.com"
      }
    }]
  })
}

resource "aws_secretsmanager_secret" "clerk_secret" {
  name = "${var.project}-${var.environment}-clerk-secret"
  
  recovery_window_in_days = 0
  
  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "clerk_secret" {
  secret_id = aws_secretsmanager_secret.clerk_secret.id
  secret_string = jsonencode({
    CLERK_SECRET_KEY = var.clerk_secret_key
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${var.project}-api"
  retention_in_days = 7
  
  tags = var.tags
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "/ecs/${var.project}-worker"
  retention_in_days = 7
  
  tags = var.tags
}

output "cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "api_service_name" {
  value = aws_ecs_service.api.name
}

output "api_target_group_arn" {
  value = aws_lb_target_group.api.arn
}