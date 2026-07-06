import { json, requireAdmin, resolveWorkspaceKey } from './_lib.mjs';
export async function handler(event) {
  const session = await requireAdmin(event);
  if (!session) return json(401, { authenticated: false });
  const workspaceKey = resolveWorkspaceKey(event);
  if (session.workspaceKey && session.workspaceKey !== workspaceKey) {
    return json(401, { authenticated: false });
  }
  return json(200, { authenticated: true, role: session.role, email: session.email || null, name: session.name || null, staffId: session.staffId || null, exp: session.exp });
}
