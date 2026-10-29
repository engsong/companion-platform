const { Client } = require('ssh2');

function runRemoteStream(cmd) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      console.log(`Executing: ${cmd}`);
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let stdout = '';
        let stderr = '';
        stream.on('close', (code) => {
          conn.end();
          resolve({ code, stdout, stderr });
        }).on('data', (d) => {
          stdout += d;
          process.stdout.write(d);
        }).stderr.on('data', (d) => {
          stderr += d;
          process.stderr.write(d);
        });
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
  console.log('Checking Docker installation...');
  const check = await runRemoteStream('which docker && which docker-compose');
  if (check.code !== 0) {
    console.log('Installing Docker using official Docker script...');
    await runRemoteStream('curl -fsSL https://get.docker.com | sh');
    await runRemoteStream('systemctl start docker && systemctl enable docker');
  }
  const verify = await runRemoteStream('docker --version && docker compose version');
  console.log('Docker verification completed.');
}

main().catch(console.error);
