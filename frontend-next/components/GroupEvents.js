import { useState, useEffect } from 'react';

export default function GroupEvents({ groupId }) {
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '' });

  useEffect(() => {
    if (groupId) {
      fetchGroupEvents();
    }
  }, [groupId]);

  const fetchGroupEvents = async () => {
    if (!groupId) return;
    
    try {
      setLoadingEvents(true);
      console.log('Fetching group events for groupId:', groupId);
      
      const response = await fetch(`http://localhost:8080/groups/${groupId}/events`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('Events response status:', response.status);
      
      if (response.ok) {
        const eventsData = await response.json();
        console.log('Events data received:', eventsData);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch group events:', response.status, errorText);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error fetching group events:', error);
      setEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEvent.title.trim() || !newEvent.description.trim()) {
      alert('Please fill in both title and description');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8080/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: parseInt(groupId),
          title: newEvent.title.trim(),
          description: newEvent.description.trim()
        }),
        credentials: 'include'
      });
      
      if (response.ok) {
        setShowCreateEvent(false);
        setNewEvent({ title: '', description: '' });
        fetchGroupEvents(); // Refresh events
        alert('Event created successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to create event: ${errorText}`);
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error creating event');
    }
  };

  const handleVote = async (eventId, choice) => {
    try {
      const response = await fetch(`http://localhost:8080/groups/events/vote?event_id=${eventId}&choice=${choice}`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        fetchGroupEvents(); // Refresh events to get updated vote counts
      } else {
        console.error('Failed to vote on event');
      }
    } catch (error) {
      console.error('Error voting on event:', error);
    }
  };

  return (
    <div className="group-events-list">
      {/* Create Event Button */}
      <div className="create-event-prompt">
        <button
          onClick={() => setShowCreateEvent(true)}
          className="create-event-button"
        >
          <span>🎉 Plan a group event! Create something exciting...</span>
        </button>
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="modal">
          <div className="modal-content">
            <span className="close" onClick={() => setShowCreateEvent(false)}>&times;</span>
            <h2>Create New Group Event</h2>
            
            <form onSubmit={handleCreateEvent}>
              <div className="form-group">
                <label>Event Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="What's the event about?"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  rows="4"
                  placeholder="Describe the event details..."
                  required
                />
              </div>
              
              <div className="form-group">
                <button type="button" onClick={() => setShowCreateEvent(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* Events List */}
      {loadingEvents ? (
        <div className="loading-container">
          <div className="loading-text">Loading events...</div>
        </div>
      ) : events.length === 0 ? (
        <div className="no-posts-message">
          <div style={{fontSize: '3rem', marginBottom: '1rem'}}>🎉</div>
          <h3>No events yet</h3>
          <p>Be the first to plan something awesome for your group!</p>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="btn btn-primary"
          >
            Create First Event
          </button>
        </div>
      ) : (
        <div className="events-container">
          {events.map(event => (
            <div key={event.id} className="event-card">
              {/* Event Header */}
              <div className="event-header">
                <div>
                  <h3 className="event-title">{event.title}</h3>
                  <div className="event-date">
                    Created {new Date(event.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px'
                }}>
                  🎉
                </div>
              </div>

              {/* Event Content */}
              <p className="event-description">{event.description}</p>

              {/* Voting Section */}
              <div style={{
                background: '#f7f8fa',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <h4 style={{fontWeight: '500', marginBottom: '12px'}}>Will you attend this event?</h4>
                <div className="event-actions">
                  <button
                    onClick={() => handleVote(event.id, 'yes')}
                    className={`btn ${event.user_vote === 'yes' ? 'btn-success' : 'btn-secondary'}`}
                    style={{
                      background: event.user_vote === 'yes' ? '#17bf63' : '#f8f9fa',
                      color: event.user_vote === 'yes' ? 'white' : '#65676b'
                    }}
                  >
                    ✅ Yes ({event.yes_count || 0})
                  </button>
                  
                  <button
                    onClick={() => handleVote(event.id, 'no')}
                    className={`btn ${event.user_vote === 'no' ? 'btn-danger' : 'btn-secondary'}`}
                    style={{
                      background: event.user_vote === 'no' ? '#e0245e' : '#f8f9fa',
                      color: event.user_vote === 'no' ? 'white' : '#65676b'
                    }}
                  >
                    ❌ No ({event.no_count || 0})
                  </button>
                </div>
                
                {event.user_vote && (
                  <p style={{fontSize: '14px', color: '#65676b', marginTop: '8px'}}>
                    You voted: <span style={{fontWeight: '500'}}>{event.user_vote === 'yes' ? 'Yes' : 'No'}</span>
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}