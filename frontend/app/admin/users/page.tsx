"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { Role, UserSummaryResponse } from "@/lib/api";
import { useAuth } from "@/lib/use-auth";
import { createAdminUser, getAdminUsers, updateAdminUserRole } from "@/lib/rbac-api";

const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "PHOTOGRAPHER", "GUEST"];

function getRoleBadge(role: Role) {
  switch (role) {
    case "SUPER_ADMIN": return "bg-purple-50 text-purple-700 border-purple-100";
    case "ADMIN": return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100";
    case "PHOTOGRAPHER": return "bg-blue-50 text-blue-700 border-blue-100";
    case "GUEST": return "bg-slate-100 text-slate-600 border-slate-200";
    default: return "bg-slate-100 text-slate-600 border-slate-200";
  }
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

function getAvatarColor(email: string) {
  const colors = ["bg-indigo-100 text-indigo-700", "bg-pink-100 text-pink-700", "bg-teal-100 text-teal-700", "bg-orange-100 text-orange-700", "bg-sky-100 text-sky-700"];
  return colors[email.charCodeAt(0) % colors.length];
}

function assignableRoles(actorRole?: Role): Role[] {
  if (actorRole === "ADMIN") return ["PHOTOGRAPHER", "GUEST"];
  return ROLES;
}

export default function AdminUsersPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<UserSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "">("");
  const [creating, setCreating] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("password123");
  const [createRole, setCreateRole] = useState<Role>("GUEST");
  const creatableRoles = assignableRoles(auth.user?.role);

  async function loadUsers() {
    setLoading(true);
    setError("");
    try { setUsers(await getAdminUsers()); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to load users"); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function onRoleChange(userId: string, role: Role) {
    setSavingId(userId);
    setError("");
    try {
      const updated = await updateAdminUserRole(userId, role);
      setUsers((prev) => prev.map((u) => (u.user_id === userId ? updated : u)));
    } catch (err) { setError(err instanceof Error ? err.message : "Failed to update role"); }
    finally { setSavingId(""); }
  }

  async function onCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const created = await createAdminUser({
        email: createEmail.trim(),
        name: createName.trim(),
        password: createPassword,
        role: createRole,
      });
      setUsers((prev) => [created, ...prev]);
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("password123");
      setCreateRole(creatableRoles[0] || "GUEST");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    if (!creatableRoles.includes(createRole)) {
      setCreateRole(creatableRoles[0] || "GUEST");
    }
  }, [creatableRoles, createRole]);

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <>
      {/* Page Header */}
      <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Management</h1>
          <p className="mt-2 text-slate-500 text-sm">Manage platform access, roles, and user accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{users.length} total users</span>
          <button onClick={() => void loadUsers()} className="inline-flex items-center gap-2 rounded-lg bg-white ring-1 ring-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
          </button>
        </div>
      </header>

      {error && <div className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"><span className="material-symbols-outlined text-[18px]">error</span>{error}</div>}

      <form onSubmit={onCreateUser} className="mb-6 rounded-xl bg-white p-4 shadow-sm border border-slate-100">
        <div className="mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">person_add</span>
          <h2 className="text-sm font-semibold text-slate-900">Create User</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Email"
            type="email"
            value={createEmail}
            onChange={(e) => setCreateEmail(e.target.value)}
            required
          />
          <input
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Full name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
          />
          <input
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Password"
            type="password"
            minLength={8}
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            required
          />
          <div className="flex gap-2">
            <select
              className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value as Role)}
            >
              {creatableRoles.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
            </select>
            <button
              type="submit"
              disabled={creating || auth.isLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Add"}
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 gap-4 rounded-xl bg-white p-4 shadow-sm border border-slate-100 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-primary focus:ring-1 focus:ring-primary"
            placeholder="Search by email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="block w-full rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm text-slate-700 focus:border-primary focus:ring-1 focus:ring-primary"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "")}
        >
          <option value="">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <span className="material-symbols-outlined animate-spin text-4xl">progress_activity</span>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold" scope="col">User</th>
                  <th className="px-6 py-4 font-semibold" scope="col">Email</th>
                  <th className="px-6 py-4 font-semibold" scope="col">Role</th>
                  <th className="px-6 py-4 font-semibold" scope="col">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right" scope="col">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">No users found.</td></tr>
                ) : filtered.map((user) => (
                  <tr key={user.user_id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-sm ${getAvatarColor(user.email)}`}>
                          {getInitials(user.email)}
                        </div>
                        <div>
                          <Link href={`/admin/users/${user.user_id}`} className="font-medium text-slate-900 hover:text-primary transition-colors">{user.email.split("@")[0]}</Link>
                          <div className="text-xs text-slate-500 font-mono">#{user.user_id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-600">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getRoleBadge(user.role)}`}>
                        {user.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-500 text-xs">
                      {new Date(user.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="relative inline-block">
                        {(() => {
                          const canManageAdminRoles = auth.user?.role !== "ADMIN";
                          const targetIsProtected = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
                          const disabled = savingId === user.user_id || (targetIsProtected && !canManageAdminRoles);
                          const options = canManageAdminRoles ? ROLES : ["PHOTOGRAPHER", "GUEST"];
                          return (
                        <select
                          className="appearance-none cursor-pointer rounded-md border border-slate-200 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-slate-700 shadow-sm focus:border-primary focus:ring-1 focus:ring-primary hover:bg-slate-50 transition-colors disabled:opacity-50"
                          value={user.role}
                          disabled={disabled}
                          onChange={(e) => void onRoleChange(user.user_id, e.target.value as Role)}
                        >
                          {options.map((r) => <option key={r} value={r}>{r.replace("_", " ")}</option>)}
                        </select>
                          );
                        })()}
                        <span className="material-symbols-outlined pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-[14px]">expand_more</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
            <p className="text-xs text-slate-500">
              Showing <span className="font-medium text-slate-900">{filtered.length}</span> of <span className="font-medium text-slate-900">{users.length}</span> users
            </p>
          </div>
        </div>
      )}
    </>
  );
}
