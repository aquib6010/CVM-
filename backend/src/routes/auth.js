/**
 * Auth Routes — Register & Login with JWT + Google OAuth.
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || '7d',
  });
};

// ─── POST /api/auth/register ────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;

    if (!email || !password || !displayName) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Create user
    const user = new User({
      email,
      passwordHash: password, // Will be hashed by pre-save hook
      displayName,
    });
    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      message: 'Account created successfully.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('[Auth] Register error:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// ─── POST /api/auth/login ───────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ─── GET /api/auth/me ───────────────────────────────────────────
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ─── POST /api/auth/google ──────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required.' });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Email not provided by Google.' });
    }

    // Find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // Link Google account if user exists with email but hasn't linked Google yet
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
        if (picture && !user.avatar) user.avatar = picture;
        await user.save();
      }
    } else {
      // Create new user from Google profile
      user = new User({
        email,
        displayName: name || email.split('@')[0],
        avatar: picture || '',
        provider: 'google',
        googleId,
      });
      await user.save();
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Google sign-in successful.',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('[Auth] Google auth error:', error);
    if (error.message?.includes('Token used too late') || error.message?.includes('Invalid token')) {
      return res.status(401).json({ message: 'Invalid or expired Google token.' });
    }
    res.status(500).json({ message: 'Server error during Google authentication.' });
  }
});

module.exports = router;
