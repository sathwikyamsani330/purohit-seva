import React from 'react';
import { NotificationCenterView } from '../../components/NotificationCenterView';

export const PriestNotificationsPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <NotificationCenterView
        role="priest"
        title="Acharya Alerts & Puja Feed"
        subtitle="Live devotee booking requests, escrow dakshina transfers, schedule reminders, and platform integrity notices."
      />
    </div>
  );
};
export default PriestNotificationsPage;
