const { Client } = require('ssh2');

function runRemote(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (d) => stdout += d).stderr.on('data', (d) => stderr += d);
      });
    }).on('error', reject).connect({
      host: '150.95.30.215',
      port: 22,
      username: 'root',
      password: 'Changeme1!2@',
      readyTimeout: 10000
    });
  });
}

async function main() {
  const ports = await runRemote('ss -tulpn | grep -E "(:80|:443|:3000|:5000|:5173)"');
  console.log('Active ports:\n', ports.stdout || 'None of these ports are currently in use!');
}

main().catch(console.error);
