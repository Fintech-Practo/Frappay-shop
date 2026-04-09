const { OAuth2Client } = require("google-auth-library");
const axios = require("axios");
const env = require("../config/env");
const pool = require("../config/db");

// Google OAuth verification
// Google OAuth verification
async function verifyGoogleToken(token) {
  try {
    const client = new OAuth2Client(
      env.oauth?.google?.clientId,
      env.oauth?.google?.clientSecret
    );

    try {
      // 1. Try verifying as an ID Token (JWT)
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: env.oauth?.google?.clientId,
      });

      const payload = ticket.getPayload();
      return {
        success: true,
        data: {
          providerUserId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          emailVerified: payload.email_verified,
        },
      };
    } catch (idTokenError) {
      // 2. If ID Token verification fails, assume it's an Access Token
      // Use it to fetch user info from Google
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const payload = response.data;
      return {
        success: true,
        data: {
          providerUserId: payload.sub,
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
          emailVerified: payload.email_verified,
        },
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || "Google token verification failed",
    };
  }
}

// Meta/Facebook OAuth verification
async function verifyMetaToken(accessToken) {
  try {
    if (!env.oauth?.meta?.appId || !env.oauth?.meta?.appSecret) {
      return {
        success: false,
        error: "Meta OAuth not configured",
      };
    }

    // Verify token with Meta Graph API
    const response = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    if (response.data.error) {
      return {
        success: false,
        error: response.data.error.message,
      };
    }

    return {
      success: true,
      data: {
        providerUserId: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture?.data?.url,
        emailVerified: true, // Meta emails are typically verified
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Meta token verification failed",
    };
  }
}

// Store OAuth provider link
async function linkOAuthProvider(userId, provider, providerUserId, email) {
  try {
    await pool.execute(
      `INSERT INTO oauth_providers (user_id, provider, provider_user_id, email) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), email = VALUES(email)`,
      [userId, provider, providerUserId, email]
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Find user by OAuth provider
async function findUserByOAuthProvider(provider, providerUserId) {
  const [rows] = await pool.execute(
    `SELECT u.* FROM users u
     INNER JOIN oauth_providers oa ON u.id = oa.user_id
     WHERE oa.provider = ? AND oa.provider_user_id = ?`,
    [provider, providerUserId]
  );
  return rows[0] || null;
}

// Check if email is linked to OAuth provider
async function findOAuthProviderByEmail(email, provider) {
  const [rows] = await pool.execute(
    `SELECT * FROM oauth_providers 
     WHERE email = ? AND provider = ?`,
    [email, provider]
  );
  return rows[0] || null;
}

module.exports = {
  verifyGoogleToken,
  verifyMetaToken,
  linkOAuthProvider,
  findUserByOAuthProvider,
  findOAuthProviderByEmail,
};

