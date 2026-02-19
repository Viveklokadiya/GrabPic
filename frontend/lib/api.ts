export type JobResponse = {
  job_id: string;
  type: string;
  status: string;
  progress_percent: number;
  stage: string;
  error: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type EventCreateResponse = {
  event_id: string;
  slug: string;
  guest_code: string;
  admin_token: string;
  guest_url: string;
  status: string;
  initial_job_id: string;
};

export type EventUpdateRequest = {
  name?: string;
  drive_link?: string;
  slug?: string;
};

export type EventResponse = {
  event_id: string;
  name: string;
  slug: string;
  drive_link: string;
  drive_folder_id: string;
  status: string;
  guest_ready: boolean;
  guest_url: string;
  created_at: string;
  updated_at: string;
  jobs: JobResponse[];
};

export type EventProcessingStatusResponse = {
  event_id: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
  total_photos: number;
  processed_photos: number;
  failed_photos: number;
  progress_percentage: number;
  job_id: string | null;
  updated_at: string;
};

export type GuestResolveResponse = {
  event_id: string;
  slug: string;
  status: string;
};

export type EventMembershipResponse = {
  event_id: string;
  user_id: string;
  joined_at: string;
};

export type GuestPhoto = {
  photo_id: string;
  file_name: string;
  thumbnail_url: string;
  web_view_link: string;
  download_url: string;
  score: number;
  rank: number;
};

export type GuestMatchResponse = {
  query_id: string;
  status: string;
  cluster_id: string | null;
  confidence: number;
  photos: GuestPhoto[];
  message: string;
};

export type UserSummaryResponse = {
  user_id: string;
  email: string;
  role: Role;
  created_at: string;
};

export type AdminPhotoLink = {
  photo_id: string;
  file_name: string;
  thumbnail_url: string;
  web_view_link: string;
  download_url: string;
  score: number;
};

export type AdminQuerySummary = {
  query_id: string;
  status: string;
  confidence: number;
  message: string;
  created_at: string;
  completed_at: string | null;
  match_count: number;
  links: AdminPhotoLink[];
};

export type AdminEventCounters = {
  photos: number;
  faces: number;
  jobs: number;
  running_jobs: number;
  failed_jobs: number;
  guest_queries: number;
  completed_queries: number;
  matched_photos: number;
};

export type AdminEventOverview = {
  event_id: string;
  name: string;
  slug: string;
  status: string;
  drive_link: string;
  drive_folder_id: string;
  guest_ready: boolean;
  guest_url: string;
  created_at: string;
  updated_at: string;
  counters: AdminEventCounters;
  latest_jobs: JobResponse[];
  latest_queries: AdminQuerySummary[];
};

export type AdminEventsResponse = {
  total_events: number;
  events: AdminEventOverview[];
};

export type Role = "SUPER_ADMIN" | "PHOTOGRAPHER" | "GUEST";

export type AuthLoginResponse = {
  user_id: string;
  email: string;
  role: Role;
  access_token: string;
};

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const AUTH_BASE = API_BASE.replace(/\/api\/v1$/, "");

type ErrorPayload = { error?: { message?: string } };

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }
  let message = `Request failed with ${response.status}`;
  try {
    const payload = (await response.json()) as ErrorPayload;
    if (payload?.error?.message) {
      message = payload.error.message;
    }
  } catch (_err) {
    // Ignore JSON parse errors and keep default message.
  }
  throw new Error(message);
}

export async function createEvent(input: {
  name: string;
  drive_link: string;
  slug?: string;
}): Promise<EventCreateResponse> {
  const response = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<EventCreateResponse>(response);
}

export async function getEvent(eventId: string, adminToken: string): Promise<EventResponse> {
  const response = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    cache: "no-store"
  });
  return parseResponse<EventResponse>(response);
}

export async function resyncEvent(eventId: string, adminToken: string): Promise<JobResponse> {
  const response = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/resync`, {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  return parseResponse<JobResponse>(response);
}

export async function cancelJob(jobId: string, token: string): Promise<JobResponse> {
  const response = await fetch(`${API_BASE}/jobs/${encodeURIComponent(jobId)}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseResponse<JobResponse>(response);
}

export async function resolveGuestEvent(slug: string, guestCode: string): Promise<GuestResolveResponse> {
  const payload: { slug: string; guest_code?: string } = { slug };
  const trimmed = String(guestCode || "").trim();
  if (trimmed) payload.guest_code = trimmed;
  const response = await fetch(`${API_BASE}/guest/events/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return parseResponse<GuestResolveResponse>(response);
}

export async function createGuestMatch(input: {
  slug: string;
  guestCode?: string;
  selfieFile: File;
}): Promise<GuestMatchResponse> {
  const form = new FormData();
  form.set("slug", input.slug);
  if (input.guestCode?.trim()) {
    form.set("guest_code", input.guestCode.trim());
  }
  form.set("selfie", input.selfieFile);
  const response = await fetch(`${API_BASE}/guest/matches`, {
    method: "POST",
    body: form
  });
  return parseResponse<GuestMatchResponse>(response);
}

export async function getGuestMatch(queryId: string): Promise<GuestMatchResponse> {
  const response = await fetch(`${API_BASE}/guest/matches/${encodeURIComponent(queryId)}`, {
    cache: "no-store"
  });
  return parseResponse<GuestMatchResponse>(response);
}

export async function getAdminEvents(adminKey: string, limit = 60): Promise<AdminEventsResponse> {
  const response = await fetch(`${API_BASE}/admin/events?limit=${encodeURIComponent(String(limit))}`, {
    headers: { Authorization: `Bearer ${adminKey}` },
    cache: "no-store"
  });
  return parseResponse<AdminEventsResponse>(response);
}

export async function loginLocal(input: { email: string; password: string }): Promise<AuthLoginResponse> {
  const response = await fetch(`${AUTH_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  return parseResponse<AuthLoginResponse>(response);
}

export type GlobalStatsResponse = {
  users: number;
  events: number;
  photos: number;
  jobs: number;
  memberships: number;
};

export type AdminJobRow = {
  job_id: string;
  event_id: string | null;
  query_id: string | null;
  type: string;
  status: string;
  stage: string;
  attempts: number;
  error: string;
  created_at: string;
  updated_at: string;
};

export type AdminEventStatusItem = {
  event_id: string;
  event_name: string;
  owner_email: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED" | string;
  processed_photos: number;
  total_photos: number;
  failed_photos: number;
  progress_percentage: number;
  last_updated: string;
  job_id: string | null;
};

export type PhotographerEventListItem = {
  event_id: string;
  name: string;
  slug: string;
  status: string;
  owner_user_id: string | null;
  photo_count: number;
  guest_count: number;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventGuestInfo = {
  user_id: string;
  email: string;
  joined_at: string;
};

export type EventGuestsResponse = {
  event_id: string;
  guests: EventGuestInfo[];
};

export type EventPhotoSafeResponse = {
  photo_id: string;
  file_name: string;
  thumbnail_url: string;
  web_view_link: string;
  download_url: string;
};

export type GuestEventListItem = {
  event_id: string;
  name: string;
  slug: string;
  status: string;
  joined_at: string;
};

export type GuestEventSummary = {
  event_id: string;
  name: string;
  slug: string;
  status: string;
  joined: boolean;
  joined_at: string | null;
};

export type GuestMyPhotoItem = {
  photo_id: string;
  thumbnail_url: string;
  download_url: string;
};

export type GuestMyPhotosResponse = {
  event_id: string;
  query_id: string | null;
  status: string;
  photos: GuestMyPhotoItem[];
  message: string;
};
