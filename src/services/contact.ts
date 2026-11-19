import { createClient } from '@/utils/supabase/client';
import type { ContactFormValues } from '@/components/contact/contactFormValues';

// Contact messages from the browser (NAB-124). Clients can't write contact_messages directly;
// the RPCs validate, rate-limit and log.

/** Sends a message from the contact page and returns its id. Empty optional fields go as null. */
export async function submitContactMessage(values: ContactFormValues): Promise<string> {
  const optional = (value: string) => value.trim() || null;
  const { data, error } = await createClient().rpc('submit_contact_message', {
    p_name: values.name.trim(),
    p_email: optional(values.email),
    p_phone: optional(values.phone),
    p_subject: optional(values.subject),
    p_message: values.message.trim(),
  });
  if (error) throw error;
  return data;
}

/** Admins only: marks a message handled and returns when (the first time, if already handled). */
export async function markContactMessageHandled(id: string): Promise<string> {
  const { data, error } = await createClient().rpc('mark_contact_message_handled', { p_id: id });
  if (error) throw error;
  return data;
}
