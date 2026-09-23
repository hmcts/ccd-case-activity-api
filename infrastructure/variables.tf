variable "product" {
  default     = "ccd"
  description = "The name of your application"
}

variable "component" {
  default     = "case-activity-api"
  description = "The name of the application component"
}

variable "location" {
  default = "UK South"
}

variable "env" {
  description = "(Required) The environment in which to deploy the application infrastructure."
}

variable "common_tags" {
  type = map(string)
}
variable "family" {
  default     = "C"
  description = "The SKU family/pricing group to use. Valid values are `C` (for Basic/Standard SKU family) and `P` (for Premium). Use P for higher availability, but beware it costs a lot more."
}

variable "sku_name" {
  default     = "Basic"
  description = "The SKU of Redis to use. Possible values are `Basic`, `Standard` and `Premium`."
}

variable "capacity" {
  default     = "1"
  description = "The size of the Redis cache to deploy. Valid values are 1, 2, 3, 4, 5"
}

variable "managed_redis_sku" {
  default     = "Balanced_B0"
  description = "The Azure Managed Redis SKU to deploy. Override per environment in tfvars."
  type        = string
}

variable "private_dns_subscription_id" {
  default     = "1baf5470-1c3e-40d3-a6f7-74bfbce4b348"
  description = "The subscription ID containing the shared private DNS zones."
  type        = string
}
