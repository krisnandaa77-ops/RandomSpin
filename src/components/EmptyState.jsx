import React from 'react';
import { Inbox, Gift, Trophy, Users, FileSpreadsheet } from 'lucide-react';

const ICONS = {
  participants: Users,
  prizes: Gift,
  winners: Trophy,
  data: FileSpreadsheet,
  default: Inbox,
};

const EmptyState = ({ type = 'default', title, message, action }) => {
  const Icon = ICONS[type] || ICONS.default;

  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Icon size={48} strokeWidth={1.2} />
      </div>
      <h3 className="empty-state-title">{title || 'Belum ada data'}</h3>
      <p className="empty-state-message">{message || 'Data akan muncul di sini setelah ditambahkan.'}</p>
      {action && (
        <div className="empty-state-action">
          {action}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
