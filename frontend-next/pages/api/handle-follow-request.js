// pages/api/handle-follow-request.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const response = await fetch('http://localhost:8080/handle-follow-request', {
      method: 'POST',
      headers: {
        'Cookie': req.headers.cookie || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });
    
    const data = await response.json();
    
    // Forward any set-cookie headers from the backend
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Handle follow request API error:', error);
    res.status(500).json({ error: 'Failed to handle follow request' });
  }
}