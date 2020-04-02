output "ccd-case-activity-api-redis-host" {
  value = "${module.redis-activity-service.host_name}"
}

output "ccd-case-activity-api-redis-port" {
  value = "${module.redis-activity-service.redis_port}"
}
