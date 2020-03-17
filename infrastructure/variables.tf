variable "product" {
  type                  = "string"
  default               = "ccd"
  description           = "The name of your application"
}
variable "location" {
  type                  = "string"
  default               = "UK South"
}

variable "env" {
  type                  = "string"
  description           = "(Required) The environment in which to deploy the application infrastructure."
}

variable "common_tags" {
  type = "map"
}
