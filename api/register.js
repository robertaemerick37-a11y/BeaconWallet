// A simple in-memory array to temporarily store mock registered users
global.mockUsers = global.mockUsers || [];

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Check if user already exists
    const userExists = global.mockUsers.find(u => u.email === email || u.username === username);
    if (userExists) {
      return res.status(400).json({ error: 'User already exists.' });
    }

    // Save user to our temporary memory cache
    const newUser = { username, email, password };
    global.mockUsers.push(newUser);

    return res.status(200).json({ message: 'Registration successful!', username });
  } catch (error) {
    return res.status(500).json({ error: 'Server error processing registration.' });
  }
}