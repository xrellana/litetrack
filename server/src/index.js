const createApp = require('./app');

const { server } = createApp();
const port = Number(process.env.PORT || 4000);

server.listen(port, () => {
  console.log(`LiteTrack API listening on http://localhost:${port}`);
});

