const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

app.use(express.static('./public'));
app.use(express.json());

app.use('/api/v1/users', require('./routes/users'));

app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));

const rooms = {};

/// socket.on('CREATE')
// generates id for room, adds it to rooms object (e.g. {'ABCD' : {host: socket.id, participants: []}})
// ALSO do socket.join()

// socket.on('JOIN')
// takes in the id as a parameter from emitter, looks for id in the object, adds socket.id to participants array

// socket.on()
io.sockets.on('connection', socket => {
  //socket.on is to set up a listener
  socket.on('CREATE', () => {
    const room_id = '1234';
    rooms[room_id] = {
      host: socket.id,
      participants: []
    };
    socket.emit('ROOM_INFO', { room_id, room: rooms[room_id] });
    socket.join(room_id, () => {
      console.log('we joined the room');
    });
  });

  socket.on('ROOM', (room) => {
    socket.join(room);
    // io.to.(id).emit, sends message to everyone in the room w/o having to iterate through array of participants
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
