// pages/api/update-profile.js
const formidable = require('formidable');
const FormData = require('form-data');
const fs = require('fs');

export const config = {
  api: {
    bodyParser: false, // Disable body parsing, we'll handle it ourselves
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const contentType = req.headers['content-type'] || '';

    // Check if it's JSON (no file upload)
    if (contentType.includes('application/json')) {
      console.log('Handling JSON request (no file)');
      
      // Parse JSON body manually since bodyParser is disabled
      let body = '';
      for await (const chunk of req) {
        body += chunk.toString();
      }
      const jsonData = JSON.parse(body);
      console.log('Parsed JSON data:', jsonData);

      // Forward as JSON to backend
      const response = await fetch('http://localhost:8080/update-profile', {
        method: 'POST',
        headers: {
          'Cookie': req.headers.cookie || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.log('Update profile response (plain text):', responseText);
        data = { 
          message: responseText,
          success: response.ok
        };
      }
      
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        res.setHeader('Set-Cookie', setCookieHeader);
      }

      return res.status(response.status).json(data);
    }

    // Handle FormData (with file upload)
    console.log('Handling FormData request (with file)');
    
    // For FormData with file, we need to proxy the raw request directly to backend
    // Because re-creating FormData can cause parsing issues
    const form = new formidable.IncomingForm({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Failed to parse form data' });
      }

      console.log('Parsed fields:', fields);
      console.log('Parsed files:', files);

      // Create new FormData for backend
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(fields).forEach(key => {
        const value = Array.isArray(fields[key]) ? fields[key][0] : fields[key];
        if (value !== undefined && value !== null && value !== '') {
          console.log(`Adding field ${key}:`, value);
          formData.append(key, String(value));
        }
      });
      
      // Add file if present
      if (files.avatarInput) {
        const file = Array.isArray(files.avatarInput) ? files.avatarInput[0] : files.avatarInput;
        console.log('Adding avatar file:', file.originalFilename, 'size:', file.size);
        
        // Create read stream for the file
        const fileStream = fs.createReadStream(file.filepath);
        formData.append('avatarInput', fileStream, {
          filename: file.originalFilename || file.newFilename,
          contentType: file.mimetype || 'application/octet-stream',
        });
      }

      try {
        console.log('Forwarding to backend...');
        const response = await fetch('http://localhost:8080/update-profile', {
          method: 'POST',
          headers: {
            'Cookie': req.headers.cookie || '',
            ...formData.getHeaders(),
          },
          body: formData,
        });

        const responseText = await response.text();
        let data;
        
        try {
          data = JSON.parse(responseText);
        } catch (jsonError) {
          console.log('Update profile response (plain text):', responseText);
          data = { 
            message: responseText,
            success: response.ok
          };
        }
        
        const setCookieHeader = response.headers.get('set-cookie');
        if (setCookieHeader) {
          res.setHeader('Set-Cookie', setCookieHeader);
        }

        res.status(response.status).json(data);
      } catch (error) {
        console.error('Update profile fetch error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
      }
    });
  } catch (error) {
    console.error('Update profile API error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}