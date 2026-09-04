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
      const items = JSON.parse(decoded.toString());
      
      const profitable = items.filter(i => {
        if (!i.suggested_price || !i.min_price || i.quantity < 3) return false;
        const steamReceive = i.suggested_price / 1.15;
        const profit = steamReceive - i.min_price;
        const roi = (profit / i.min_price) * 100;
        return profit > 0 && roi > 10;
      });

      profitable.sort((a, b) => {
        const pA = (a.suggested_price / 1.15) - a.min_price;
        const pB = (b.suggested_price / 1.15) - b.min_price;
        return pB - pA;
      });

      console.log(`Found ${profitable.length} profitable items.`);
      console.log(JSON.stringify(profitable.slice(0, 3), null, 2));
    });
  });
});
req.end();
