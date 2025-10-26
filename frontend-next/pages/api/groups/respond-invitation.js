// pages/api/groups/respond-invitation.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Be permissive with incoming payloads (many clients may send different casing or types)
    const rawId = req.body?.invitation_id || req.body?.InvitationID || req.body?.invitationId || req.body?.id;
    const rawAction = (req.body?.action || req.body?.Action || req.body?.status || '').toString().toLowerCase();
    const invitation_id = Number(rawId || 0);
    const action = rawAction;

    if (!invitation_id || !action || !['accept', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'Invalid invitation_id or action' });
    }

    // Convert action to status format expected by backend
    const status = action === 'accept' ? 'accepted' : 'declined';

    const response = await fetch('http://localhost:8080/respond-group-invitation', {
      method: 'POST',
      headers: {
        'Cookie': req.headers.cookie || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        invitation_id: invitation_id,
        status: status
      }),
    });
    
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('Response is not valid JSON:', responseText);
      if (response.ok) {
        data = { success: true, message: `Invitation ${action}ed successfully` };
      } else {
        data = { error: responseText || `Failed to ${action} invitation` };
      }
    }
    
    // Forward any set-cookie headers from the backend
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      res.setHeader('Set-Cookie', setCookieHeader);
    }
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Respond invitation API error:', error);
    res.status(500).json({ error: 'Failed to process invitation response' });
  }
}