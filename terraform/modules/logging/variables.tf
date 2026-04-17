variable "environment" { type = string }
variable "project" { type = string }
variable "ecs_cluster_name" { type = string }
variable "log_retention_days" { type = number }
variable "tags" { type = map(string) }

# CloudWatch log groups are created in ECS module
# This module can be extended for additional logging configurations

output "log_group_prefix" {
  value = "/ecs/${var.project}"
}