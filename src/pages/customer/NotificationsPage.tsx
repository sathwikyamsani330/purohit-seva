import React from 'react';
import { NotificationCenterView } from '../../components/NotificationCenterView';

export const NotificationsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#faf8f5] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <NotificationCenterView
          role="customer"
          title="Devotee Notification Center"
          subtitle="Real-time ceremony tracking, priest arrival updates, 100% escrow payment receipts, and festival panchang alerts."
        />
      </div>
    </div>
  );
};
export default NotificationsPage;
