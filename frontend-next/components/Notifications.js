  import { useState, useEffect, useRef } from 'react';
  import { useWebSocketContext } from '../contexts/WebSocketContext';

  const Notifications = () => {
    const { notifications, clearNotifications, setNotifications } = useWebSocketContext();
    const [visible, setVisible] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const wrapperRef = useRef(null);
    // Only show these notification types for now (include follow responses and new follower)
    const allowedNotificationTypes = ['follow_request', 'follow_request_response', 'new_follower', 'group_invitation', 'group_join_request', 'new_groupEvent'];

    useEffect(() => {
      // Count only allowed notification types (ignore private messages / disabled types)
      const count = (notifications || []).filter(n => allowedNotificationTypes.includes(n.type)).length;
      setUnreadCount(count);
    }, [notifications]);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
      function handleClickOutside(e) {
        if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
          setVisible(false);
        }
      }
      function handleEsc(e) {
        if (e.key === 'Escape') setVisible(false);
      }
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEsc);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEsc);
      };
    }, [wrapperRef]);

    // Only consider allowed notification types for rendering and latest
    const filteredNotifications = (notifications || []).filter(n => allowedNotificationTypes.includes(n.type));
    const latest = filteredNotifications.length > 0 ? filteredNotifications[filteredNotifications.length - 1] : null;

    const bellBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

    // const bellBg = latest ? (bellColorByType[latest.type] || '#ffd700') : '#ffd700';

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
            // Optimistically remove this notification from UI so users see immediate feedback.
            // We'll keep a snapshot to restore if the backend call fails.
            const prevNotifications = (notifications || []).slice();
            setNotifications(prev => prev.filter(item => item !== n));
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
              // restore previous notifications on failure
              setNotifications(prevNotifications);
              let errMsg = 'Failed to respond to follow request';
              try {
                const txt = await resp.text();
                try {
                  const parsed = JSON.parse(txt);
                  if (parsed && parsed.message) errMsg = parsed.message;
                  else if (parsed && parsed.error) errMsg = parsed.error;
                  else errMsg = JSON.stringify(parsed);
                } catch (e) {
                  if (txt && txt.trim()) errMsg = txt.trim();
                }
              } catch (e) {}
              console.error(errMsg);
              return;
            }
          } else if (n.type === 'group_invitation') {
            // WebSocket notifications sometimes omit the invitation id. Instead
            // of throwing client-side, send group_id + inviter in the request so
            // the server-side proxy can resolve the invitation id and perform
            // the action. This keeps the client simple and avoids brittle
            // matching logic here.
            const invitationId = n.InvitationID || n.invitation_id || n.invitationId || 0;
            const gid = n.GroupID || n.group_id || n.groupId || null;
            const inviter = n.From || n.from || n.inviter_id || n.inviterId || null;

            const bodyPayload = invitationId ? { invitation_id: invitationId, action } : { group_id: gid, inviter_id: inviter, action };

            const resp = await fetch('/api/groups/respond-invitation', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify(bodyPayload)
            });
            if (!resp.ok) {
              setNotifications(prevNotifications);
              console.error('Failed to respond to group invitation');
              return;
            }
          } else if (n.type === 'group_join_request') {
            const requestId = n.RequestID || n.request_id || n.requestId;
            const resp = await fetch('/api/groups/respond-request', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ request_id: requestId, action })
            });
            if (!resp.ok) {
              setNotifications(prevNotifications);
              console.error('Failed to respond to join request');
              return;
            }
          }

          // Already removed optimistically above; nothing more to do here.

        } catch (err) {
          console.error('Action failed', err);
        }
      };

      // We no longer set an overall background per-item; use content accent instead.

      // Define per-type content accent and text colors for better visibility
      const typeStyles = {
        group_invitation: { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#fff7cc', chipText: '#7a5900' },
        follow_request:   { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#ecfeff', chipText: '#065f46' },
        new_follower:     { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#fff7e6', chipText: '#92400e' },
        group_join_request:{itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#fff1f2', chipText: '#7f1d1d' },
        new_groupPost:    { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#f0fdf4', chipText: '#065f46' },
        new_groupEvent:   { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#eef2ff', chipText: '#3730a3' },
        default:          { itemBg: '#ffffff', itemText: '#0b1220', chipBg: '#f8fafc', chipText: '#0b1220' }
      };
      const appliedStyle = typeStyles[n.type] || typeStyles.default;

      return (
        <div key={idx} className="notification-item">
          <div className="notification-icon" aria-hidden>
            {/* simple type based icon */}
            {n.type === 'group_invitation' && <span className="icon-circle">📨</span>}
            {n.type === 'follow_request' && <span className="icon-circle">👥</span>}
            {n.type === 'group_join_request' && <span className="icon-circle">🙋</span>}
            {n.type === 'new_groupPost' && <span className="icon-circle">📝</span>}
            {n.type === 'new_groupEvent' && <span className="icon-circle">📅</span>}
            {!['group_invitation','follow_request','group_join_request','new_groupPost','new_groupEvent'].includes(n.type) && <span className="icon-circle">🔔</span>}
          </div>

          <div className="notification-body">
            <div className="notification-row">
              <div className="notification-title"><span className="highlight">{title}</span></div>
              <div className="notification-time">{when}</div>
            </div>

            <div className="notification-content" style={{ background: appliedStyle.accent, color: appliedStyle.text, padding: '8px', borderRadius: 8 }}>
              {n.Content || n.content || n.message || (n.Username || n.username ? `${n.Username || n.username} sent a notification` : 'No message')}
            </div>

            <div className="notification-meta">{n.Username || n.username || ''}</div>

            {(n.type === 'follow_request' || n.type === 'group_join_request' || n.type === 'group_invitation') && (
              <div className="notification-actions">
                <button className="btn-accept" onClick={() => handleAction('accept')}>Accept</button>
                <button className="btn-decline" onClick={() => handleAction('decline')}>Decline</button>
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
    <div className="notifications-wrapper" ref={wrapperRef}>
            <button className="notif-btn" onClick={() => setVisible(v => !v)} style={{ position: 'relative' }}>
              <span className="bell" style={{ color: '#fff', background: bellBg }}>🔔
                {latest && <span className="inbell-text">{(latest.Username || latest.username || '').slice(0,2)}</span>}
              </span>
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>
        {visible && (
          <div className="notif-dropdown" role="dialog" aria-label="Notifications">
            <div className="notif-header">
              <div className="notif-header-left">Notifications</div>
              {filteredNotifications && filteredNotifications.length > 0 ? (
                <button className="btn-clear" onClick={() => { clearNotifications(); }} aria-label="Clear all notifications">Clear all</button>
              ) : (
                <div style={{ color: '#6b7280', fontSize: 13 }}>Clear all</div>
              )}
            </div>
            {filteredNotifications && filteredNotifications.length > 0 ? (
              // render allowed notification types
              filteredNotifications.slice().reverse().map((n, idx) => renderNotification(n, idx))
            ) : (
              <div className="notif-empty">
                <div style={{ fontSize: 28 }}>🔔</div>
                <div style={{ marginTop: 8, fontWeight: 600 }}>No notifications</div>
                <div style={{ marginTop: 6, color: '#6b7280', fontSize: 13 }}>You're all caught up</div>
              </div>
            )}
          </div>
        )}
        <style jsx>{`
          .notifications-wrapper { position: relative; display: inline-block; }
          .notif-btn { background: transparent; border: none; cursor: pointer; font-size: 18px; display:flex; align-items:center; gap:6px; position:relative }
          .bell { color: #fff; padding: 6px; border-radius: 50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; position:relative; font-size:18px }
          .inbell-text { position:absolute; bottom:2px; right:2px; font-size:10px; color:#fff; background:rgba(0,0,0,0.15); padding:1px 4px; border-radius:3px }
          .badge { position: absolute; top: -6px; right: -6px; background: #d9534f; color: white; border-radius: 50%; padding: 4px 6px; font-size: 11px; min-width:20px; height:20px; display:flex; align-items:center; justify-content:center }

          /* Force light panel by default, regardless of global theme */
          .notif-dropdown { position: absolute; right: 0; top: 52px; width: min(420px, 92vw);
            max-height: 68vh; overflow: auto; background: #ffffff !important; color:#0b1220;
            border-radius:12px; border: none; box-shadow: 0 12px 36px rgba(12,18,30,0.12); z-index: 200; }

          /* Explicit white bg to prevent “black item” inheritance */
          .notification-item { background:#ffffff !important; padding: 12px;
            border-bottom: 1px solid rgba(15,23,42,0.06); display:flex; gap:12px; align-items:flex-start }

          .notification-icon { flex: 0 0 52px; display:flex; align-items:center; justify-content:center }
          .icon-circle { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center;
            background: linear-gradient(135deg, rgba(102,126,234,0.12), rgba(118,75,162,0.08)); font-size:18px }

          .notification-body { flex:1; min-width:0; color:#0b1220 }
          .notification-row { display:flex; align-items:center; justify-content:space-between; gap:8px; background:transparent }
          .notification-title { font-weight: 700; color: #0b1220 }
          .notification-time { font-size: 12px; color: #6b7280 }
          .notification-content { font-size: 14px; margin-top: 8px; line-height:1.35; overflow-wrap:anywhere; display:block }
          .notification-meta { font-size: 12px; color: #6b7280; margin-top: 8px }

          .notification-actions { margin-top:10px; display:flex; gap:8px }
          .btn-accept { background:linear-gradient(90deg,#10b981,#059669); border:none; color:white; padding:8px 10px; border-radius:8px; font-weight:600; cursor:pointer }
          .btn-decline { background:transparent; border:1px solid rgba(15,23,42,0.12); color:#0f172a; padding:8px 10px; border-radius:8px; cursor:pointer }
          .btn-accept:hover { filter:brightness(.95) }
          .btn-decline:hover { background:rgba(15,23,42,0.03) }

          .notif-empty { padding: 20px; color: #6b7280; text-align:center }
          .notif-header { display:flex; align-items:center; justify-content:space-between; padding:12px 16px;
            border-bottom:1px solid rgba(15,23,42,0.06);
            background: linear-gradient(90deg, rgba(102,126,234,0.08), rgba(118,75,162,0.06));
            border-top-left-radius:12px; border-top-right-radius:12px }
          .notif-header-left { font-weight:700; color:#0b1220; font-size:16px }
          .btn-clear { background:transparent; border:none; color:#6b7280; cursor:pointer; font-size:13px; padding:6px 8px; border-radius:8px }
          .btn-clear:hover { color:#111827; background:rgba(0,0,0,0.03) }

          .highlight { background: linear-gradient(90deg,#fff9c4,#fff59d); padding: 4px 8px; border-radius: 8px; font-weight:700; color: #0b1220 }
          .notification-item:hover { background:#fafafa; transform: translateY(-1px); transition: all 120ms ease }

          @media (max-width: 640px) {
            .notif-dropdown { right: 8px; left: 8px; width: auto }
          }
        `}</style>

      </div>
    );
  };

  export default Notifications;
