const https = require('https');

const searchYoutube = (query) => {
  return new Promise((resolve) => {
    https.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const match = data.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match) {
          console.log(`${query} -> ${match[1]}`);
        } else {
          console.log(`${query} -> Not found`);
        }
        resolve();
      });
    }).on('error', () => {
        console.log(`${query} -> Error`);
        resolve();
    });
  });
};

const main = async () => {
  await searchYoutube("Mi Llano, Tu y Yo Jorge Guerrero");
  await searchYoutube("Amor Traicionero Araima Amezquita");
  await searchYoutube("Ya Llego el Fin de Semana Fernando Tovar");
  await searchYoutube("Cuidado Sanson Scarlett Linares");
  await searchYoutube("Concedeme El Honor Leonard Reyes");
};
main();
