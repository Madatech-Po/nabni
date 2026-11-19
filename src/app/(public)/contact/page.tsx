import { Container, Typography } from '@mui/material';
import { createClient } from '@/utils/supabase/server';
import ContactForm from '@/components/contact/ContactForm';

// "تواصل معنا" (NAB-124). Visitors can write too; a signed-in user gets their name and email filled in.
export default async function ContactPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let defaults: { name?: string; email?: string } | undefined;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
    defaults = { name: profile?.full_name ?? undefined, email: user.email ?? undefined };
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom color="primary" fontWeight="bold">
        تواصل معنا
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        عندك سؤال أو اقتراح أو واجهتك مشكلة؟ اكتب لنا وسيرد عليك فريق نبني.
      </Typography>
      <ContactForm defaults={defaults} />
    </Container>
  );
}
