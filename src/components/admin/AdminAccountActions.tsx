import Link from 'next/link';
import { Button, Stack } from '@mui/material';
import SignOutButton from '@/components/layout/SignOutButton';

const onDark = { color: 'inherit', borderColor: 'rgba(255, 255, 255, 0.6)', whiteSpace: 'nowrap', '&:hover': { borderColor: 'common.white', bgcolor: 'rgba(255, 255, 255, 0.12)' } };

// The admin header's way out: back to the public site, or sign out (NAB-104).
export default function AdminAccountActions() {
  return (
    <Stack direction="row" spacing={1}>
      <Button component={Link} href="/" variant="outlined" sx={{ ...onDark, borderRadius: 6 }}>
        الموقع
      </Button>
      <SignOutButton variant="outlined" color="inherit" sx={onDark} />
    </Stack>
  );
}
