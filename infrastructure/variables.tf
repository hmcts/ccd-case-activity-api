variable "product" {
  type                  = "string"
  default               = "ccd"
  description           = "The name of your application"
}

variable "raw_product" {
  default = "ccd" // jenkins-library overrides product for PRs and adds e.g. pr-118-ccd
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

variable "asp_name" {
  type = "string"
  description = "App Service Plan (ASP) to use for the webapp, 'use_shared' to make use of the shared ASP"
  default = "use_shared"
}

variable "asp_rg" {
  type = "string"
  description = "App Service Plan (ASP) resource group for 'asp_name', 'use_shared' to make use of the shared resource group"
  default = "use_shared"
}

variable "appinsights_instrumentation_key" {
  description = "Instrumentation key of the App Insights instance this webapp should use. Module will create own App Insights resource if this is not provided"
  default = ""
}

variable "use_shared_appinsight" {
  description = "Use the ENV shared Application Insight instance (vs creating a standalone instance)"
  default = "false"
}
