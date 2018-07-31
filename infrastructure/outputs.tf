output "ccd-case-activity-api_endpoint" {
  value = "${module.ccd-case-activity-api.gitendpoint}"
}

output "ccd-case-activity-api-redis-host" {
  value = "${module.redis-activity-service.host_name}"
}

output "ccd-case-activity-api-redis-port" {
  value = "${module.redis-activity-service.redis_port}"
}
