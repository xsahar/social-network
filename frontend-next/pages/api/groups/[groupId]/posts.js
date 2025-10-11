export default async function handler(req, res) {
  const { groupId } = req.query;

  if (req.method === 'GET') {
    try {
      const response = await fetch(`http://localhost:8080/groups/${groupId}/posts`, {
        method: 'GET',
        headers: {
          'Cookie': req.headers.cookie || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        res.status(200).json(data);
      } else {
        const errorText = await response.text();
        res.status(response.status).json({ error: errorText });
      }
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}