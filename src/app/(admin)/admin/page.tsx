import { redirect } from 'next/navigation';

// Educator verification is the only admin section so far.
export default function AdminHome() {
  redirect('/admin/educators');
}
