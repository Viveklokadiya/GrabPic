import { apiFetch } from "@/lib/api-client";
import type {
  AdminEventStatusItem,
  AdminEventsResponse,
  AdminJobRow,
  CreateUserRequest,
  EventCreateResponse,
  EventMembershipResponse,
  EventUpdateRequest,
  EventGuestsResponse,
  EventProcessingStatusResponse,
  EventPhotoSafeResponse,
  EventResponse,
  GlobalStatsResponse,
  GuestEventListItem,
  GuestEventSummary,
  GuestMatchResponse,
  GuestMyPhotosResponse,
  PhotographerEventListItem,
  Role,
  UserSummaryResponse,
} from "@/lib/api";

// Consolidated RBAC dashboard calls.
export function getAdminMetrics() {
  return apiFetch<GlobalStatsResponse>("/admin/system/metrics");
}

export function getAdminEventsOverview(limit = 40) {
  return apiFetch<AdminEventsResponse>(`/admin/events?limit=${encodeURIComponent(String(limit))}`);
}

export function getAdminUsers() {
  return apiFetch<UserSummaryResponse[]>("/admin/users");
}

export function createAdminUser(input: CreateUserRequest) {
  return apiFetch<UserSummaryResponse>("/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminUserRole(userId: string, role: Role) {
  return apiFetch<UserSummaryResponse>(`/admin/users/${encodeURIComponent(userId)}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export function getAdminJobs(limit = 80) {
  return apiFetch<AdminJobRow[]>(`/admin/jobs?limit=${encodeURIComponent(String(limit))}`);
}

export function getAdminEventsStatus() {
  return apiFetch<AdminEventStatusItem[]>("/admin/events/status");
}

export function cancelAdminEvent(eventId: string) {
  return apiFetch<EventProcessingStatusResponse>(`/admin/events/${encodeURIComponent(eventId)}/cancel`, {
    method: "POST",
  });
}

export function deleteEvent(eventId: string) {
  return apiFetch<{ deleted: boolean }>(`/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
}

export function getPhotographerEvents() {
  return apiFetch<PhotographerEventListItem[]>("/photographer/events");
}

export function createPhotographerEvent(input: {
  name: string;
  drive_link: string;
  slug?: string;
  guest_auth_required?: boolean;
}) {
  return apiFetch<EventCreateResponse>("/photographer/events", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getPhotographerEvent(eventId: string) {
  return apiFetch<EventResponse>(`/photographer/events/${encodeURIComponent(eventId)}`);
}

export function syncPhotographerEvent(eventId: string) {
  return apiFetch(`/photographer/events/${encodeURIComponent(eventId)}/sync`, { method: "POST" });
}

export function getPhotographerEventStatus(eventId: string) {
  return apiFetch<EventProcessingStatusResponse>(`/photographer/events/${encodeURIComponent(eventId)}/status`);
}

export function cancelPhotographerEvent(eventId: string) {
  return apiFetch<EventProcessingStatusResponse>(`/photographer/events/${encodeURIComponent(eventId)}/cancel`, {
    method: "POST",
  });
}

export function getPhotographerEventPhotos(eventId: string) {
  return apiFetch<EventPhotoSafeResponse[]>(`/photographer/events/${encodeURIComponent(eventId)}/photos`);
}

export function getPhotographerEventGuests(eventId: string) {
  return apiFetch<EventGuestsResponse>(`/photographer/events/${encodeURIComponent(eventId)}/guests`);
}

export function updatePhotographerEvent(eventId: string, input: EventUpdateRequest) {
  return apiFetch<EventResponse>(`/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getGuestEvents() {
  return apiFetch<GuestEventListItem[]>("/guest/events");
}

export function joinGuestEvent(eventId: string) {
  return apiFetch(`/guest/events/${encodeURIComponent(eventId)}/join`, { method: "POST" });
}

export function joinGuestEventFromSlug(slug: string) {
  return apiFetch<EventMembershipResponse>("/guest/events/join-link", {
    method: "POST",
    body: JSON.stringify({ slug }),
  });
}

export function getGuestEvent(eventId: string) {
  return apiFetch<GuestEventSummary>(`/guest/events/${encodeURIComponent(eventId)}`);
}

export function submitGuestSelfie(eventId: string, selfieFile: File) {
  const form = new FormData();
  form.set("selfie", selfieFile);
  return apiFetch<GuestMatchResponse>(`/guest/events/${encodeURIComponent(eventId)}/selfie`, {
    method: "POST",
    body: form,
  });
}

export function getGuestMatch(queryId: string) {
  return apiFetch<GuestMatchResponse>(`/guest/matches/${encodeURIComponent(queryId)}`);
}

export function getGuestMyPhotos(eventId: string) {
  return apiFetch<GuestMyPhotosResponse>(`/guest/events/${encodeURIComponent(eventId)}/my-photos`);
}
