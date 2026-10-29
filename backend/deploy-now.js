const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const tarPath = path.join(rootDir, 'project.tar.gz');

console.log('📦 Creating git archive bundle from root:', rootDir);
execSync(`git archive -o "${tarPath}" HEAD`, { cwd: rootDir });

const conn = new Client();

console.log('Connecting to 150.95.30.215 via SSH to upload and deploy...');

conn.on('ready', () => {
  console.log('SSH connection established. Uploading project bundle...');
  conn.sftp((err, sftp) => {
    if (err) throw err;

    const remoteTar = '/tmp/project.tar.gz';
    const readStream = fs.createReadStream(tarPath);
    const writeStream = sftp.createWriteStream(remoteTar);

    writeStream.on('close', () => {
      console.log('Upload finished! Extracting and deploying on Ubuntu server...');

      const deployCmd = `
        rm -rf /opt/companion-platform &&
        mkdir -p /opt/companion-platform &&
        tar -xzf /tmp/project.tar.gz -C /opt/companion-platform &&
        cd /opt/companion-platform &&
        echo "Files in /opt/companion-platform:" &&
        ls -la &&
        echo "Building Docker containers on remote server..." &&
        docker compose build &&
        docker compose up -d &&
        echo "Running Prisma migrations on PostgreSQL database..." &&
        sleep 6 &&
        docker compose exec -T backend npx prisma db push &&
        docker compose exec -T backend npx tsx prisma/seed.ts &&
        docker ps --filter "name=companion"
      `;

      conn.exec(deployCmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code) => {
          console.log(`Deployment script finished with exit code ${code}`);
          conn.end();
          try { fs.unlinkSync(tarPath); } catch (e) {}
        }).on('data', (d) => {
          process.stdout.write(d);
        }).stderr.on('data', (d) => {
          process.stderr.write(d);
        });
      });
    });

    readStream.pipe(writeStream);
  });
}).on('error', (e) => {
  console.error('SSH Error:', e.message);
}).connect({
  host: '150.95.30.215',
  port: 22,
  username: 'root',
  password: 'Changeme1!2@',
  readyTimeout: 15000
});
