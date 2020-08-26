const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi();
// const chance = require('chance').Chance();

app.use(require('cors')());

app.use(express.urlencoded({ extended: true }));
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
      host: { id: socket.id, name: data.username },
      participants: [{ id: socket.id, name: data.username, score: 0, hasSelected: false }],
      token: data.token,
      songQueue: [],
      judge: { id: socket.id, name: data.username }
    };

    console.log(rooms);

    socket.join(data.room_id);
    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });

  });

  socket.on('JOIN', (data) => {
    socket.join(data.room_id);
    const currentParticipants = rooms[data.room_id].participants;
    currentParticipants.push({ id: socket.id, name: data.name, score: 0, isJudge: false, hasSelected: false });
    console.log(rooms);
    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });
  });

  socket.on('ROOM', (room) => {
    socket.join(room);
    // io.to.(id).emit, sends message to everyone in the room w/o having to iterate through array of participants
  });

  socket.on('CHOICE', ({ room_id, songData }) => {
    // console.log(room_id, songData);
    const currentQueue = rooms[room_id].songQueue;
    currentQueue.push({ songData, participant: socket.id });
    const updatedParticipants = rooms[room_id].participants.map(participant => {
      if(participant.id === socket.id) return { ...participant, hasSelected: true };
      return participant;
    });
    // console.log(currentQueue);
    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: { ...rooms[room_id],  participants: updatedParticipants } });
  });

  socket.on('PLAY', ({ room_id, songData }) => {
    console.log('PLAYING ' + songData.title);
    io.sockets.in(room_id).emit('PLAY_SONG', songData);
  });

  socket.on('WINNER', ({ room_id, winner }) => {
    console.log('WINNER' + room_id, winner);
    const updatedScore = rooms[room_id].participants.map(participant => {
      if(participant.id === winner) return { ...participant, score: participant.score + 1 };
      return participant;
    });
    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: { ...rooms[room_id],  participants: updatedScore } });
  });
});

module.exports = server;
