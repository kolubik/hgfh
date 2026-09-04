import https from 'https';
import zlib from 'zlib';

const options = {
  hostname: 'api.skinport.com',
  port: 443,
  path: '/v1/items?app_id=730&currency=USD',
  method: 'GET',
  headers: {
    'Accept-Encoding': 'br'
  }
};

const req = https.request(options, (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    zlib.brotliDecompress(buffer, (err, decoded) => {
      if (err) {
        console.error(err);
        return;
      }
      const data = JSON.parse(decoded.toString());
      console.log(JSON.stringify(data.slice(0, 2), null, 2));
    });
  });
});
req.end();
