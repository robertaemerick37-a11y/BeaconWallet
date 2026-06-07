export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Simulating sending a 4-digit token
    return res.status(200).json({ message: 'Reset code generated successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error resetting password.' });
  }
}