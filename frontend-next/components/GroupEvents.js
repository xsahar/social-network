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
    <div className="space-y-6">
      {/* Create Event Button */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <button
          onClick={() => setShowCreateEvent(true)}
          className="w-full text-left p-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-lg border-2 border-dashed border-purple-300 transition-colors"
        >
          <span className="text-purple-600">🎉 Plan a group event! Create something exciting...</span>
        </button>
      </div>

      {/* Create Event Modal */}
      {showCreateEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-[500px] shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Group Event</h3>
              <button 
                onClick={() => setShowCreateEvent(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-semibold"
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Event Title</label>
                <input
                  type="text"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="What's the event about?"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Describe the event details..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateEvent(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Events List */}
      {loadingEvents ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
          <p className="text-gray-500 mt-4">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🎉</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events yet</h3>
          <p className="text-gray-500 mb-4">Create your first group event and get everyone involved!</p>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create First Event
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {events.map(event => (
            <div key={event.id} className="bg-white rounded-lg shadow-sm border border-l-4 border-l-purple-500">
              <div className="p-6">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">🎉</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        Created {new Date(event.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Event Content */}
                <p className="text-gray-700 mb-6 leading-relaxed">{event.description}</p>

                {/* Voting Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-3">Will you attend this event?</h4>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleVote(event.id, 'yes')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                        event.user_vote === 'yes'
                          ? 'bg-green-100 text-green-700 border border-green-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      <span>✅ Yes</span>
                      <span>({event.yes_count || 0})</span>
                    </button>
                    
                    <button
                      onClick={() => handleVote(event.id, 'no')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                        event.user_vote === 'no'
                          ? 'bg-red-100 text-red-700 border border-red-300'
                          : 'bg-white text-gray-600 border border-gray-300 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      <span>❌ No</span>
                      <span>({event.no_count || 0})</span>
                    </button>
                  </div>
                  
                  {event.user_vote && (
                    <p className="text-sm text-gray-500 mt-2">
                      You voted: <span className="font-medium">{event.user_vote === 'yes' ? 'Yes' : 'No'}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}