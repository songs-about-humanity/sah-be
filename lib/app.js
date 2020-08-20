const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('./public'));
app.use(express.json());

app.use('/api/v1/users', require('./routes/users'));

app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));

const room = {
  host: null,
  participants: [],
  // authReady: false,
  // started: false
};

io.on('connection', socket => {
  //socket.on is to set up a listener
  socket.on('HELLO', () => {
    console.log('hello world');
  });

  socket.on('JOIN', () => {
    //is there a player 1?
    if(!room.host) {
      room.host = { id: socket.id };
      console.log(room);
      io.emit('JOIN', room);
    } else {
      room.participants.push({ id: socket.id });
      console.log(room);
      io.emit('JOIN', room);
    }
  });
});

module.exports = server;
