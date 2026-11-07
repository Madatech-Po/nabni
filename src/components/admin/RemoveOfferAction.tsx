'use client';

import AdminActions from './AdminActions';

// remove_offer checks is_admin(), keeps the offer as 'removed' and logs the reason (NAB-86).
export default function RemoveOfferAction({ offerId }: { offerId: string }) {
  return (
    <AdminActions
      actions={[{ to: 'removed', label: 'إزالة العرض', color: 'error', needsReason: true }]}
      rpc="remove_offer"
      args={{ p_offer_id: offerId }}
    />
  );
}
