// Pages are rendered on the server, whose time zone is usually UTC. Always show Egypt time.
const TIME_ZONE = 'Africa/Cairo';

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString('ar-EG', { timeZone: TIME_ZONE });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString('ar-EG', { timeZone: TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' });
}
