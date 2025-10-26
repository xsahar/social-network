import { useState, useEffect } from 'react';
import { useWebSocketContext } from '../contexts/WebSocketContext';

const Notifications = () => {
  const { notifications, clearNotifications, setNotifications } = useWebSocketContext();
  const [visible, setVisible] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Only show these notification types for now (include follow responses and new follower)
  const allowedNotificationTypes = ['follow_request', 'follow_request_response', 'new_follower', 'group_invitation', 'group_join_request', 'new_groupEvent'];

  useEffect(() => {
    // Count only allowed notification types (ignore private messages / disabled types)
    const count = (notifications || []).filter(n => allowedNotificationTypes.includes(n.type)).length;
    setUnreadCount(count);
  }, [notifications]);

  const latest = notifications && notifications.length > 0 ? notifications[notifications.length - 1] : null;
  const bellColorByType = {
    follow_request: '#0056d6',
    follow_request_response: '#198754',
    new_follower: '#6f42c1',
    group_invitation: '#fd7e14',
    group_join_request: '#dc3545',
    new_groupEvent: '#6610f2',
    new_groupPost: '#0d6efd'
  };
  const bellBg = latest ? (bellColorByType[latest.type] || '#ffd700') : '#ffd700';

  const renderNotification = (n, idx) => {
    const titleMap = {
      'group_join_request': 'Group join request',
      'join_request_sent': 'Join request status',
      'invitation_response': 'Group invitation',
      'group_invitation': 'Group invitation',
      'new_groupPost': 'New group post',
      'new_groupEvent': 'New group event',
      'follow_request': 'Follow request',
      'follow_request_response': 'Follow request reply',
      'new_follower': 'New follower'
    };
    const title = titleMap[n.type] || n.type;
  const rawTs = n.Timestamp || n.timestamp || n.time || n.Time;
  const when = rawTs ? new Date(rawTs).toLocaleString() : '';

    const handleAction = async (action) => {
      try {
        // action should be 'accept' or 'decline'
        if (n.type === 'follow_request') {
          // Call handle-follow-request proxy
          // Accept a variety of possible field names from WebSocket payloads
          const rawRequester = n.From || n.from || n.RequesterID || n.requester_id || n.requesterId || n.user_id || n.UserID;
          const requesterId = Number(rawRequester || 0);
          if (!requesterId || isNaN(requesterId) || requesterId <= 0) {
            throw new Error('Invalid requester id');
          }

          const resp = await fetch('/api/handle-follow-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ requester_id: requesterId, action })
          });
          if (!resp.ok) {
            // Try to parse backend response body for a helpful message
            let errMsg = 'Failed to respond to follow request';
            try {
              const txt = await resp.text();
              try {
                const parsed = JSON.parse(txt);
                if (parsed && parsed.message) errMsg = parsed.message;
                else if (parsed && parsed.error) errMsg = parsed.error;
                else errMsg = JSON.stringify(parsed);
              } catch (e) {
                // plain text
                if (txt && txt.trim()) errMsg = txt.trim();
              }
            } catch (e) {
              // ignore
            }
            throw new Error(errMsg);
          }
        } else if (n.type === 'group_invitation') {
          // Ensure we have an invitation ID. WebSocket notifications sometimes
          // omit the invitation id, so fetch the user's pending invitations and
          // try to match by group and inviter.
          let invitationId = n.InvitationID || n.invitation_id || n.invitationId;
          if (!invitationId) {
            try {
              const invResp = await fetch('/api/groups/invitations', { credentials: 'include' });
              if (invResp.ok) {
                const invData = await invResp.json();
                const invs = invData.invitations || [];
                const gid = n.GroupID || n.group_id || n.groupId;
                const inviter = n.From || n.from || n.inviter_id || n.inviterId;
                const match = invs.find(i => (i.group_id == gid) && (i.inviter_id == inviter));
                if (match) invitationId = match.id;
              }
            } catch (e) {
              console.error('Failed to lookup invitation id', e);
            }
          }

          if (!invitationId) throw new Error('Invitation id not found');

          const resp = await fetch('/api/groups/respond-invitation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ invitation_id: invitationId, action })
          });
          if (!resp.ok) throw new Error('Failed to respond to group invitation');
        } else if (n.type === 'group_join_request') {
          const requestId = n.RequestID || n.request_id || n.requestId;
          const resp = await fetch('/api/groups/respond-request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ request_id: requestId, action })
          });
          if (!resp.ok) throw new Error('Failed to respond to join request');
        }

        // Remove this notification from UI
        setNotifications(prev => prev.filter(item => {
          // match by type and id or From
          if (item === n) return false;
          if (n.type === 'follow_request') return !(item.type === 'follow_request' && item.From === n.From && item.To === n.To);
          if (n.type === 'group_invitation') {
            const iid = n.InvitationID || n.invitation_id || n.invitationId;
            return !(item.type === 'group_invitation' && ((item.InvitationID || item.invitation_id || item.invitationId) === iid));
          }
          if (n.type === 'group_join_request') {
            const rid = n.RequestID || n.request_id || n.requestId;
            return !(item.type === 'group_join_request' && ((item.RequestID || item.request_id || item.requestId) === rid));
          }
          return true;
        }));

      } catch (err) {
        console.error('Action failed', err);
      }
    };

    const bgByType = {
      follow_request: '#0e020bff', // light blue
      follow_request_response: '#0e020bff', // light green
      group_invitation: '#0e020bff', // light yellow/orange
      group_join_request: '#0e020bff', // light pink
      new_groupEvent: '#0e020bff', // light purple
      new_groupPost: '#0e020bff',
      group_member_update: '#0e020bff'
    };
    const bg = bgByType[n.type] || '#ffffff';

    return (
      <div key={idx} className="notification-item" style={{ background: bg }}>
        <div className="notification-title"><span className="highlight">{title}</span></div>
  <div className="notification-content">{n.Content || n.content || n.message || (n.Username || n.username ? `${n.Username || n.username} sent a notification` : 'No message')}</div>
  <div className="notification-meta">{n.Username || n.username || ''} — {when}</div>
        {/* Action buttons for actionable notifications */}
        {(n.type === 'follow_request' || n.type === 'group_join_request' || n.type === 'group_invitation') && (
          <div className="notification-actions">
            <button className="btn-accept" onClick={() => handleAction('accept')}>Accept</button>
            <button className="btn-decline" onClick={() => handleAction('decline')}>Decline</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="notifications-wrapper">
          <button className="notif-btn" onClick={() => setVisible(v => !v)} style={{ position: 'relative' }}>
            <span className="bell" style={{ color: '#fff', background: bellBg }}>🔔
              {latest && <span className="inbell-text">{(latest.Username || latest.username || '').slice(0,2)}</span>}
            </span>
            {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
          </button>
      {visible && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <div className="notif-header-left">Notifications</div>
            {notifications && notifications.length > 0 && (
              <button className="btn-clear" onClick={() => { clearNotifications(); }} aria-label="Clear all notifications">Clear all</button>
            )}
          </div>
          {notifications && notifications.length > 0 ? (
            // Only render allowed notification types
            notifications.filter(n => allowedNotificationTypes.includes(n.type)).slice().reverse().map((n, idx) => renderNotification(n, idx))
          ) : (
            <div className="notif-empty">No notifications</div>
          )}
        </div>
      )}
      <style jsx>{`
        .notifications-wrapper { position: relative; display: inline-block; }
        .notif-btn { background: transparent; border: none; cursor: pointer; font-size: 18px; display:flex; align-items:center; gap:6px; position:relative }
        .bell { color: #fff; padding: 6px; border-radius: 50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; position:relative; font-size:18px }
        .inbell-text { position:absolute; bottom:2px; right:2px; font-size:10px; color:#fff; background:rgba(0,0,0,0.15); padding:1px 4px; border-radius:3px }
        .badge { position: absolute; top: -6px; right: -6px; background: #d9534f; color: white; border-radius: 50%; padding: 4px 6px; font-size: 11px; min-width:20px; height:20px; display:flex; align-items:center; justify-content:center }
        .notif-dropdown { position: absolute; right: 0; top: 48px; width: 360px; max-height: 480px; overflow: auto; background: #fff; border: 1px solid rgba(0,0,0,0.12); box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 200; border-radius:6px }
  .notification-item { padding: 8px 10px; border-bottom: 1px solid #eee; display:flex; gap:8px; align-items:flex-start }
  .notification-title { font-weight: 700; }
  .notification-item { background: #fff; display:block }
  .notification-item .notification-title { color: #0b1220 !important }
  .notification-content { font-size: 13px; color: #0b1220 !important; margin-top: 4px; }
  .notification-meta { font-size: 11px; color: #374151 !important; margin-top: 6px; }
        .notification-actions { margin-top:8px }
        .btn-accept { background:#28a745; border:none; color:white; padding:6px 8px; border-radius:4px; margin-right:8px }
        .btn-decline { background:#dc3545; border:none; color:white; padding:6px 8px; border-radius:4px }
        .notif-empty { padding: 12px; color: #666; }
        .notif-header { display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid rgba(0,0,0,0.06) }
        .notif-header-left { font-weight:700; color:#0b1220 }
        .btn-clear { background:transparent; border:none; color:#6b7280; cursor:pointer; font-size:13px; padding:6px 8px; border-radius:4px }
        .btn-clear:hover { color:#111827; background:rgba(0,0,0,0.03) }
        .highlight { background: #fff59d; padding: 2px 6px; border-radius: 6px; font-weight:700; color: #0b1220 }
      `}</style>
    </div>
  );
};

export default Notifications;
