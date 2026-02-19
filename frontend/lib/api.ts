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

export type GuestResolveResponse = {
  event_id: string;
  slug: string;
  status: string;
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

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");

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
  const response = await fetch(`${API_BASE}/guest/events/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, guest_code: guestCode })
  });
  return parseResponse<GuestResolveResponse>(response);
}

export async function createGuestMatch(input: {
  slug: string;
  guestCode: string;
  selfieFile: File;
}): Promise<GuestMatchResponse> {
  const form = new FormData();
  form.set("slug", input.slug);
  form.set("guest_code", input.guestCode);
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
