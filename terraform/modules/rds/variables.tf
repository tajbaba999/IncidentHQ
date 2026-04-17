variable "environment" {
  type = string
}

variable "project" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "security_group_ids" {
  type = list(string)
}

variable "database_name" {
  type    = string
  default = "pulseping"
}

variable "db_instance_class" {
  type    = string
  default = "db.t3.micro"
}

variable "db_allocated_storage" {
  type    = number
  default = 20
}

variable "db_master_username" {
  type    = string
  default = "pulseping"
}

variable "db_master_password" {
  type      = string
  sensitive = true
}

variable "backup_retention_days" {
  type    = number
  default = 7
}

variable "tags" {
  type    = map(string)
  default = {}
}