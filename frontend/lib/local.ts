export type StoredEventSecrets = {
  eventId: string;
  slug: string;
  adminToken: string;
  guestCode: string;
};

const PREFIX = "grabpic_event_";

export function saveEventSecrets(input: StoredEventSecrets): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(`${PREFIX}${input.eventId}`, JSON.stringify(input));
}

export function loadEventSecrets(eventId: string): StoredEventSecrets | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(`${PREFIX}${eventId}`);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredEventSecrets;
    if (parsed?.eventId !== eventId) {
      return null;
    }
    return parsed;
  } catch (_err) {
    return null;
  }
}

