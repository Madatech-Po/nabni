import { Suspense } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { ADMIN_PAGE_SIZE, getContactMessages } from '@/services/admin';
import AdminPagination from '@/components/admin/AdminPagination';
import ContactMessageHandledButton from '@/components/admin/ContactMessageHandledButton';
import { formatDateTime } from '@/utils/formatDate';

// Messages from the "تواصل معنا" page (NAB-124), newest first. Unhandled ones stand out until an
// admin marks them handled. The admin layout already checks the role.
export default async function AdminMessagesPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams;
  const { items, total } = await getContactMessages({ page: Number(searchParams.page) || 1 });

  return (
    <>
      <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>
        الرسائل
      </Typography>
      <Typography variant="body1" color="text.secondary" mb={4}>
        رسائل صفحة تواصل معنا. رد على المرسل بالبريد أو الموبايل، ثم اضغط «تم التعامل».
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">لا توجد رسائل.</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => {
            const handled = Boolean(item.handled_at);
            return (
              <Paper
                key={item.id}
                component="article"
                aria-label={`رسالة من ${item.name}`}
                variant="outlined"
                sx={{
                  p: 3,
                  borderInlineStart: '4px solid',
                  borderInlineStartColor: handled ? 'divider' : 'warning.main',
                  bgcolor: handled ? 'background.paper' : '#fff8e1', // amber-50: the theme has no warning.50
                  opacity: handled ? 0.85 : 1,
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between" alignItems={{ sm: 'flex-start' }} mb={1.5}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{item.subject || 'بدون موضوع'}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.name}
                      {item.email && (
                        <>
                          {' · '}
                          <Box component="a" href={`mailto:${item.email}`} dir="ltr" sx={{ color: 'primary.main' }}>{item.email}</Box>
                        </>
                      )}
                      {item.phone && (
                        <>
                          {' · '}
                          <Box component="a" href={`tel:${item.phone}`} dir="ltr" sx={{ color: 'primary.main' }}>{item.phone}</Box>
                        </>
                      )}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      {formatDateTime(item.created_at)}
                    </Typography>
                    {handled ? (
                      <Chip size="small" label="تم التعامل" />
                    ) : (
                      <Chip size="small" color="warning" label="جديدة" />
                    )}
                  </Stack>
                </Stack>

                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: handled ? 0 : 2 }}>
                  {item.message}
                </Typography>

                {handled ? (
                  <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
                    تم التعامل في {formatDateTime(item.handled_at as string)}
                  </Typography>
                ) : (
                  <ContactMessageHandledButton messageId={item.id} />
                )}
              </Paper>
            );
          })}
        </Stack>
      )}

      <Suspense>
        <AdminPagination total={total} pageSize={ADMIN_PAGE_SIZE} />
      </Suspense>
    </>
  );
}
