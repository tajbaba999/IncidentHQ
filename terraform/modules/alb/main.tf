variable "environment" { type = string }
variable "project" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "security_group_ids" { type = list(string) }
variable "ecs_service_api_name" { type = string }
variable "ecs_api_target_group_arn" { type = string }
variable "domain_name" { type = string }
variable "hosted_zone_id" { type = string }
variable "tags" { type = map(string) }

resource "aws_lb" "main" {
  name               = "${var.project}-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection = false

  tags = var.tags
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"

  certificate_arn = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = var.ecs_api_target_group_arn
  }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  tags = var.tags
}

resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

output "alb_dns_name" {
  value = aws_lb.main.dns_name
}

output "alb_zone_id" {
  value = aws_lb.main.zone_id
}