import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { google } from 'googleapis';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = join(__dirname, '..', 'token.json');
const PORT = 3000;

class GoogleAuth extends EventEmitter {
  async authorize(credentials) {
    const { client_secret, client_id } = credentials;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      `http://localhost:${PORT}`
    );

    let token;

    try {
      token = JSON.parse(await fs.readFile(TOKEN_PATH));
      oAuth2Client.setCredentials(token);
    } catch {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
      });

      this.emit('auth', authUrl);

      const code = await new Promise(resolve =>
        this.once('token', resolve)
      );

      const { tokens } = await oAuth2Client.getToken(code);
      oAuth2Client.setCredentials(tokens);

      await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
    }

    return oAuth2Client;
  }

  sendToken(code) {
    this.emit('token', code);
  }
}

class GoogleDrive extends GoogleAuth {
  async getDrive(credentials) {
    const auth = await this.authorize(credentials);
    return google.drive({ version: 'v3', auth });
  }
}

export { GoogleAuth, GoogleDrive };
