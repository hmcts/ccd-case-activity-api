provider "vault" {
  address = "https://vault.reform.hmcts.net:6200"
}

locals {
  env_ase_url = "${var.env}.service.${data.terraform_remote_state.core_apps_compute.ase_name[0]}.internal"
}

module "ccd-case-activity-api" {
  source   = "git@github.com:contino/moj-module-webapp?ref=master"
  product  = "${var.product}-case-activity-api"
  location = "${var.location}"
  env      = "${var.env}"
  ilbIp    = "${var.ilbIp}"
  subscription = "${var.subscription}"

  app_settings = {
    CORS_ORIGIN_METHODS = "GET,POST,OPTIONS"
    /* TODO Need to change the below to the external hostnames once set up */
    CORS_ORIGIN_WHITELIST = "https://ccd-case-management-web-${local.env_ase_url},${var.cors_origin}"
    IDAM_BASE_URL = "${var.idam_api_url}"
    REDIS_HOST = "${module.redis-activity-service.host_name}"
    REDIS_PORT = "${module.redis-activity-service.redis_port}"
    REDIS_PASSWORD = "${module.redis-activity-service.access_key}"
    REDIS_KEY_PREFIX = "${var.redis_key_prefix}"
    REDIS_ACTIVITY_TTL = "${var.redis_activity_ttl_sec}"
    REDIS_USER_DETAILS_TTL = "${var.redis_user_details_ttl_sec}"
    APP_REQUEST_TIMEOUT = "${var.app_request_timeout_sec}"
    APP_STORE_CLEANUP_CRONTAB = "${var.app_store_cleanup_crontab}"
  }
}

module "redis-activity-service" {
  source   = "git@github.com:contino/moj-module-redis?ref=master"
  product  = "${var.product}-activity-service"
  location = "${var.location}"
  env      = "${var.env}"
  subnetid = "${data.terraform_remote_state.core_apps_infrastructure.subnet_ids[2]}"
}