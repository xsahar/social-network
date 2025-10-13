export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const { groupId } = req.query;
      
      if (!groupId) {
        return res.status(400).json({ error: 'Group ID is required' });
      }

      // Forward the request to the Go backend
      const response = await fetch(`http://localhost:8080/get-invitable-users?groupId=${groupId}`, {
        method: 'GET',
        headers: {
          'Cookie': req.headers.cookie || '',
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        res.status(200).json(data);
      } else {
        console.error('Backend error:', response.status, data);
        res.status(response.status).json(data);
      }
    } catch (error) {
      console.error('Get invitable users API error:', error);
      res.status(500).json({ error: 'Failed to fetch invitable users' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}