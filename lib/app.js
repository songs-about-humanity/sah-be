const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const chance = require('chance').Chance();

app.use(require('cors')());

app.use(express.urlencoded({ extended: true }));
app.use(express.static('./public'));
app.use(express.json());

app.use(require('./middleware/not-found'));
app.use(require('./middleware/error'));

const rooms = {};

io.sockets.on('connection', socket => {

  socket.on('CREATE', (data) => {
    let generatedRoomId = chance.word({ length: 4 });
    while(rooms[generatedRoomId]) {
      generatedRoomId = chance.word({ length: 4 });
    }

    socket.emit('CODE', generatedRoomId);

    rooms[generatedRoomId] = {
      host: { id: socket.id, name: data.username },
      participants: [{ id: socket.id, name: data.username, score: 0, hasSelected: false }],
      token: data.token,
      songQueue: [],
      judge: { id: socket.id, name: data.username },
      round: 0
    };

    socket.join(generatedRoomId);
    io.sockets.in(generatedRoomId).emit('ROOM_INFO', { room_id: generatedRoomId, room: rooms[generatedRoomId] });
  });

  socket.on('JOIN', (data) => {
    socket.join(data.room_id);
    const currentParticipants = rooms[data.room_id].participants;
    currentParticipants.push({ id: socket.id, name: data.name, score: 0, hasSelected: false });

    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });
  });

  socket.on('LEAVE_ROOM', (room_id) => {
    socket.emit('RESET');
    socket.leave(room_id);
  });

  socket.on('CHOICE', ({ room_id, songData }) => {
    const currentQueue = rooms[room_id].songQueue;

    currentQueue.push({ songData, participant: socket.id });

    const updatedParticipants = rooms[room_id].participants.map(participant => {
      if(participant.id === socket.id) return { ...participant, hasSelected: true };
      return participant;
    });

    rooms[room_id] = { ...rooms[room_id], participants: updatedParticipants };

    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });

  socket.on('PLAY', ({ room_id, songData }) => {
    io.sockets.in(room_id).emit('PLAY_SONG', songData);
  });
  
  socket.on('PAUSE', (room_id) => {
    io.sockets.in(room_id).emit('PAUSE');
  });

  socket.on('WINNER', ({ room_id, winner }) => {
    const updatedParticipants = rooms[room_id].participants.map(participant => {

      if(participant.id === winner) {
        if(participant.score + 1 === 5) io.sockets.in(room_id).emit('GAME_WINNER', participant);
        return { ...participant, hasSelected: false, score: participant.score + 1 
        };
      }
      return { ...participant, hasSelected: false };
    });

    const newRound = rooms[room_id].round + 1;

    const nextJudge = updatedParticipants.length <= newRound 
      ? rooms[room_id].participants[newRound % updatedParticipants.length] 
      : rooms[room_id].participants[newRound];    

    rooms[room_id] = { ...rooms[room_id], songQueue: [], judge: nextJudge, participants: updatedParticipants, round: newRound };

    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });
});

module.exports = server;
