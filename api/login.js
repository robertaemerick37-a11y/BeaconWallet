global.mockUsers = global.mockUsers || [];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Missing username/email or password.' });
    }

    // Search for a matching user by either their username or email
    const user = global.mockUsers.find(
      u => (u.email === identifier || u.username === identifier) && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username, email, or password.' });
    }

    // Return the successful user data back to the frontend script
    return res.status(200).json({
      email: user.email,
      username: user.username
    });
  } catch (error) {
    return res.status(500).json({ error: 'Server error processing login.' });
  }
}