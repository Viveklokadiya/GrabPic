"use client";

import { useEffect, useState } from "react";

import type { Role, UserSummaryResponse } from "@/lib/api";
import { getAdminUsers, updateAdminUserRole } from "@/lib/rbac-api";

const ROLES: Role[] = ["SUPER_ADMIN", "PHOTOGRAPHER", "GUEST"];

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      setUsers(await getAdminUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function onRoleChange(userId: string, role: Role) {
    setSavingId(userId);
    setError("");
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((item) => (item.user_id === userId ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingId("");
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading users...</p>;

  return (
    <main className="rounded-xl border border-line bg-white p-4">
      <h1 className="font-display text-2xl font-semibold text-slate-900">Users</h1>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase text-muted">
            <tr>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Created</th>
              <th className="py-2">Change role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.user_id} className="border-t border-line">
                <td className="py-2 pr-3">{user.email}</td>
                <td className="py-2 pr-3">{user.role}</td>
                <td className="py-2 pr-3">{new Date(user.created_at).toLocaleString()}</td>
                <td className="py-2">
                  <select
                    className="field !w-auto !py-1.5 !text-sm"
                    value={user.role}
                    disabled={savingId === user.user_id}
                    onChange={(event) => void onRoleChange(user.user_id, event.target.value as Role)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? <p className="text-sm text-muted">No users available.</p> : null}
      </div>
    </main>
  );
}
