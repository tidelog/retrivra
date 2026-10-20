export function testAdminUrl(env) {
  const message = "Database tests require TEST_DATABASE_ADMIN_URL: explicit loopback PostgreSQL URL with credentials, port and /postgres; NODE_ENV must not be production. See docs/database.md.";
  let url;
  try { url = new URL(env.TEST_DATABASE_ADMIN_URL); } catch { throw new Error(message); }
  if (env.NODE_ENV === "production" ||
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      !url.username || !url.password || !url.port || url.pathname !== "/postgres" ||
      url.search || url.hash) throw new Error(message);
  // No pg environment defaults, URL options or remote host forwarding are accepted.
  return url;
}
