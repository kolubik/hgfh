import https from 'https';

const options = {
  hostname: 'api.skinport.com',
  port: 443,
  path: '/v1/items?app_id=730&currency=USD',
  method: 'OPTIONS',
};

const req = https.request(options, (res) => {
  console.log(res.headers);
});
req.end();
