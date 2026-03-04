import fsSync from 'fs';
import path from 'path';

class GoogleDrive extends GoogleAuth {
  constructor() {
    super();
    this.drive = null;
  }

  async init(credentials) {
    const auth = await this.authorize(credentials);
    this.drive = google.drive({ version: 'v3', auth });
  }

  // 🔍 Obtener ID por nombre (simple)
  async getFileIdByName(name) {
    const res = await this.drive.files.list({
      q: `name='${name}' and trashed=false`,
      fields: 'files(id, name)',
    });

    if (!res.data.files.length) return null;

    return res.data.files[0].id;
  }

  // ⬆️ Subir archivo grande (1GB+)
  async uploadFile(filePath, parentFolderId = null) {
    const fileName = path.basename(filePath);

    const fileMetadata = {
      name: fileName,
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const media = {
      body: fsSync.createReadStream(filePath),
    };

    const res = await this.drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    return res.data.id;
  }

  // ⬇️ Descargar archivo grande (1GB+)
  async downloadFile(fileId, destinationPath) {
    const dest = fsSync.createWriteStream(destinationPath);

    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    await new Promise((resolve, reject) => {
      res.data
        .on('end', resolve)
        .on('error', reject)
        .pipe(dest);
    });

    return destinationPath;
  }
}
