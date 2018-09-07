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

variable "ilbIp" {}

variable "subscription" {}

variable "capacity" {
  default = "1"
}

variable "idam_api_url" {
  default = "http://betaDevBccidamAppLB.reform.hmcts.net"
}

variable "cors_origin" {
  default = "https://www-ccd.nonprod.platform.hmcts.net"
}

variable "auth_white_list" {
  default = "^caseworker-.+"
}

variable "auth_black_list" {
  default = "solicitor"
}

variable "redis_ssl_enabled" {
  default = "true"
}

variable "redis_key_prefix" {
  default = "activity:"
}

variable "redis_activity_ttl_sec" {
  default = "5"
}

variable "redis_user_details_ttl_sec" {
  default = "6000"
}

variable "app_request_timeout_sec" {
  default = "5"
}

variable "app_store_cleanup_crontab" {
  default = "* * * * *"
}

variable "common_tags" {
  type = "map"
}
