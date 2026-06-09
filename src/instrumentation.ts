export async function register() {
  // Node 18's fetch (undici) can hang/time out connecting to some hosts (e.g.
  // Google's OAuth token endpoint) when it prefers an unreachable IPv6 route.
  // Forcing IPv4-first DNS resolution avoids the ConnectTimeoutError.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dns = await import("node:dns");
    dns.setDefaultResultOrder("ipv4first");
  }
}
