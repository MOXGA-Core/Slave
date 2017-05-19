const jwt = require('jwt-simple');
const crypto = require('crypto');
const User = require('../datamodels/user');

const JwtSecret = process.env.JWT_SECRET || 'dev_jwt_secret';
const TokenValidityTime = 7; // Validity time in days

class AuthService {

  // Finds a user by the specified token and returns the user
  // On error, returns null
  static findUserByToken(token) {
    try {
      const decoded = jwt.decode(token, JwtSecret);
      return decoded.expireDate > Date.now() ? User.findOne({ username: decoded.username }).exec() : null;
    }
    catch (err) {
      return null;
    }
  }

  // Finds a user by the specified user name and password
  static findUserByCredentials(username, password) {
    const encrypted = crypto.createHash('sha256').update(password).digest('hex');
    return User.findOne({ username: username, password: encrypted }).exec();
  }

  // Finds a user by the specified user name
  // Can be used for example for checking if a user exists
  static findUserByUsername(username) {
    return User.findOne({ username: username }).exec();
  }

  // Generates the auth token for the specified user
  static generateAuthToken(user) {
    const date = new Date();
    const expires = date.setDate(date.getDate() + TokenValidityTime);
    return jwt.encode({
      username: user.username,
      expireDate: expires
    }, JwtSecret);
  }

  // Parses auth token from the request
  static parseTokenFromReq(req) {
    return (req.body && req.body.access_token) || (req.query && req.query.access_token) ||
      req.headers['x-access-token'];
  }

}

module.exports = AuthService;
