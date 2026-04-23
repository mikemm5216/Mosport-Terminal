export function isSecurityKillSwitchEnabled() {
  return process.env.MOSPORT_SECURITY_KILL_SWITCH === "true";
}
