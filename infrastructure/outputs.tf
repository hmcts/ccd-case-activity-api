output "ccd-case-activity-api-redis-host" {
  value = module.redis-activity-service.host_name
}

output "ccd-case-activity-api-redis-port" {
  value = module.redis-activity-service.redis_port
}

output "ccd-case-activity-api-managed-redis-host" {
  value = module.managed_redis_activity_service.hostname
}

output "ccd-case-activity-api-managed-redis-port" {
  value = module.managed_redis_activity_service.port
}
