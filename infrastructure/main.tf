provider "azurerm" {
  features {}
}

data "azurerm_subnet" "core_infra_redis_subnet" {
  name                 = "core-infra-subnet-1-${var.env}"
  virtual_network_name = "core-infra-vnet-${var.env}"
  resource_group_name  = "core-infra-${var.env}"
}

data "azurerm_key_vault" "shared" {
  name                = "ccd-${var.env}"
  resource_group_name = "ccd-shared-${var.env}"
}

resource "azurerm_key_vault_secret" "redis_connection_string" {
  name         = "activity-redis-password"
  value        = module.redis-activity-service.access_key
  key_vault_id = data.azurerm_key_vault.shared.id
}

resource "azurerm_key_vault_secret" "managed_redis_password" {
  name         = "activity-managed-redis-password"
  value        = module.managed_redis_activity_service.primary_access_key
  key_vault_id = data.azurerm_key_vault.shared.id
}

module "redis-activity-service" {
  source                        = "git@github.com:hmcts/cnp-module-redis?ref=4.x"
  product                       = "${var.product}-activity-service"
  location                      = var.location
  env                           = var.env
  private_endpoint_enabled      = true
  redis_version                 = "6"
  business_area                 = "cft" # cft or sds
  public_network_access_enabled = false
  common_tags                   = var.common_tags
  sku_name                      = var.sku_name
  family                        = var.family
  capacity                      = var.capacity
}

module "managed_redis_activity_service" {
  source = "git@github.com:hmcts/terraform-module-azure-managed-redis?ref=main"

  product     = var.product
  component   = var.component
  env         = var.env
  location    = var.location
  common_tags = var.common_tags

  sku_name = var.managed_redis_sku

  public_network_access   = "Disabled"
  create_private_endpoint = true
  subnet_id               = data.azurerm_subnet.core_infra_redis_subnet.id
  private_dns_zone_ids = [
    "/subscriptions/${var.private_dns_subscription_id}/resourceGroups/core-infra-intsvc-rg/providers/Microsoft.Network/privateDnsZones/privatelink.redis.azure.net"
  ]

  access_keys_authentication_enabled = true
  client_protocol                    = "Encrypted"
  clustering_policy                  = "NoCluster"
  eviction_policy                    = "VolatileLRU"
}
