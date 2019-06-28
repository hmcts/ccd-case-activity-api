provider "azurerm" {
  version = "1.22.1"
}

locals {
  env_ase_url = "${var.env}.service.core-compute-${var.env}.internal"

  // Shared Resource Group
  previewResourceGroup = "${var.raw_product}-shared-aat"
  nonPreviewResourceGroup = "${var.raw_product}-shared-${var.env}"
  sharedResourceGroup = "${(var.env == "preview" || var.env == "spreview") ? local.previewResourceGroup : local.nonPreviewResourceGroup}"

  sharedAppServicePlan = "${var.raw_product}-${var.env}"
  sharedASPResourceGroup = "${var.raw_product}-shared-${var.env}"
}

data "azurerm_subnet" "core_infra_redis_subnet" {
  name                 = "core-infra-subnet-1-${var.env}"
  virtual_network_name = "core-infra-vnet-${var.env}"
  resource_group_name = "core-infra-${var.env}"
}

module "ccd-case-activity-api" {
  source   = "git@github.com:hmcts/cnp-module-webapp?ref=Bump-JCV"
  product  = "${var.product}-case-activity-api"
  location = "${var.location}"
  appinsights_location = "${var.location}"
  env      = "${var.env}"
  ilbIp    = "${var.ilbIp}"
  subscription = "${var.subscription}"
  common_tags  = "${var.common_tags}"
  asp_name = "${(var.asp_name == "use_shared") ? local.sharedAppServicePlan : var.asp_name}"
  asp_rg = "${(var.asp_rg == "use_shared") ? local.sharedASPResourceGroup : var.asp_rg}"
  website_local_cache_sizeinmb = 700
  capacity = "${var.capacity}"
  appinsights_instrumentation_key = "${var.appinsights_instrumentation_key}"

  app_settings = {
    CORS_ORIGIN_METHODS = "GET,POST,OPTIONS"
    /* TODO Need to change the below to the external hostnames once set up */
    CORS_ORIGIN_WHITELIST = "https://ccd-case-management-web-${local.env_ase_url},${var.cors_origin}"
    AUTH_WHITE_LIST = "${var.auth_white_list}"
    AUTH_BLACK_LIST = "${var.auth_black_list}"
    IDAM_BASE_URL = "${var.idam_api_url}"
    REDIS_HOST = "${module.redis-activity-service.host_name}"
    REDIS_PORT = "${module.redis-activity-service.redis_port}"
    REDIS_PASSWORD = "${module.redis-activity-service.access_key}"
    REDIS_SSL_ENABLED = "${var.redis_ssl_enabled}"
    REDIS_KEY_PREFIX = "${var.redis_key_prefix}"
    REDIS_ACTIVITY_TTL = "5"
    REDIS_USER_DETAILS_TTL = "6000"
    APP_REQUEST_TIMEOUT = "${var.app_request_timeout_sec}"
    APP_STORE_CLEANUP_CRONTAB = "${var.app_store_cleanup_crontab}"
  }
}

module "redis-activity-service" {
  source   = "git@github.com:hmcts/cnp-module-redis?ref=master"
  product  = "${var.product}-activity-service"
  location = "${var.location}"
  env      = "${var.env}"
  subnetid = "${data.azurerm_subnet.core_infra_redis_subnet.id}"
  common_tags  = "${var.common_tags}"
}
