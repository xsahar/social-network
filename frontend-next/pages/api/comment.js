// pages/api/comment.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Create form data for the backend
    const formData = new FormData();
    formData.append('post_id', req.body.postId.toString());
    formData.append('comment', req.body.content);

    const response = await fetch('http://localhost:8080/create-comment', {
      method: 'POST',
      body: formData,
      headers: {
        'Cookie': req.headers.cookie || '',
      },
    });
    
    const data = await response.json();
    
    // Forward any set-cookie headers from the backend
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Comment API error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
}