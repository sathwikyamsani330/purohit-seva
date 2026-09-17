import React from 'react';
import { NotificationCenterView } from '../../components/NotificationCenterView';

export const AdminNotificationsPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto">
      <NotificationCenterView
        role="admin"
        title="Admin Operations Telemetry & Alerts"
        subtitle="Platform-wide booking incidents, protection reports, high-severity policy infractions, and system events."
      />
    </div>
  );
};
export default AdminNotificationsPage;
