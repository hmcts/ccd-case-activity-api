variable "product" {
  default     = "ccd"
  description = "The name of your application"
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
