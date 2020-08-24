const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();
// const chance = require('chance').Chance();

app.use(express.static('./public'));
app.use(express.json());

app.use('/api/v1/users', require('./routes/song-search'));

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
  socket.on('CREATE', (data) => {
    // let generatedRoomId = chance.word({ length: 4 });
    // while(rooms[generatedRoomId] !== undefined) {
    //   generatedRoomId = chance.word({ length: 4 });
    // }

    socket.emit('CODE', data.room_id);

    rooms[data.room_id] = {
      host: socket.id,
      participants: [socket.id],
      token: data.token
    };
    console.log(data.room_id, rooms[data.room_id]);

    socket.join(data.room_id);
    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });

  });

  socket.on('JOIN', (room_id) => {
    socket.join(room_id);
    const currentParticipants = rooms[room_id].participants;
    currentParticipants.push(socket.id);
    console.log(rooms);
    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });

  socket.on('ROOM', (room) => {
    socket.join(room);
    // io.to.(id).emit, sends message to everyone in the room w/o having to iterate through array of participants
  });

  socket.on('CHOICE', (songData) => {
    console.log(songData);
  });

  // socket.on('SEARCH', ({ songQuery, token }) => {
  //   console.log('searching');
  //   spotifyApi.setAccessToken(token);
  //   spotifyApi.searchTracks(songQuery)
  //     .then(data => {
  //       console.log(data.body.tracks.items);
  //     }, error => {
  //       console.error(error);
  //     });
  // });

  // socket.on('JOIN', () => {
  //   //is there a player 1?
  //   if(!room.host) {
  //     room.host = { id: socket.id };
  //     console.log(room);
  //     io.emit('JOIN', room);
  //   } else {
  //     room.participants.push({ id: socket.id });
  //     console.log(room);
  //     io.emit('JOIN', room);
  //   }
  // });
});

module.exports = server;
