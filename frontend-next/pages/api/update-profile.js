// pages/api/update-profile.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    console.log('Received update request body:', req.body);
    
    // Create FormData for backend
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Add all the fields from the request body
    if (req.body.firstname) formData.append('fname', req.body.firstname);
    if (req.body.lastname) formData.append('lname', req.body.lastname);
    if (req.body.nickname) formData.append('nickname', req.body.nickname || '');
    if (req.body.email) formData.append('email', req.body.email);
    if (req.body.age) formData.append('age', req.body.age.toString());
    if (req.body.gender) formData.append('gender', req.body.gender);
    if (req.body.dateOfBirth) formData.append('dateOfBirth', req.body.dateOfBirth);
    if (req.body.bio !== undefined) formData.append('bio', req.body.bio || '');
    formData.append('isPrivate', req.body.isPrivate ? '1' : '0');
    
    console.log('Sending to backend...');
    
    const response = await fetch('http://localhost:8080/update-profile', {
      method: 'POST',
      headers: {
        'Cookie': req.headers.cookie || '',
        ...formData.getHeaders(),
      },
      body: formData,
    });
    
    console.log('Backend response status:', response.status);
    
    const data = await response.json();
    console.log('Backend response data:', data);
    
    // Forward any set-cookie headers from the backend
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }

    res.status(response.status).json(data);
  } catch (error) {
    console.error('Update profile API error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}