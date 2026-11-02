import tls from 'node:tls';
import fs from 'node:fs';

const host = 'db.nbpevnpiimwicvlhjyzl.supabase.co';
const outPath = new URL('./supabase-ca.crt', import.meta.url);

const s = tls.connect(
  {
    host,
    port: 5432,
    rejectUnauthorized: false,
    servername: host,
  },
  () => {
    const cert = s.getPeerCertificate();
    if (!cert || !cert.raw) {
      console.error('No certificate received');
      process.exit(1);
    }
    const b64 = cert.raw.toString('base64').match(/.{1,64}/g).join('\n');
    const pem = `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----\n`;
    fs.writeFileSync(outPath, pem);
    console.log('Cert saved. Subject CN:', cert.subject?.CN);
    s.end();
  },
);
s.on('error', (e) => {
  console.error('Connection error:', e.message);
  process.exit(1);
});
