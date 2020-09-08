const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const chance = require('chance').Chance();
const { prompts } = require('./models/Prompts');


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
    const randomIndex = Math.floor(Math.random() * prompts.length);
    const usedPrompts = [randomIndex];

    socket.emit('CODE', generatedRoomId);

    rooms[generatedRoomId] = {
      host: { id: socket.id, name: data.username },
      participants: [{ id: socket.id, name: data.username, score: 0, hasSelected: false }],
      token: data.token,
      songQueue: [],
      currentPrompt: prompts[randomIndex],
      usedPrompts: usedPrompts,
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

    rooms[data.room_id] = { ...rooms[data.room_id], participants: currentParticipants };

    io.sockets.in(data.room_id).emit('ROOM_INFO', { room_id: data.room_id, room: rooms[data.room_id] });
  });

  socket.on('START_GAME', (room_id) => {
    
  });

  socket.on('LEAVE_ROOM', (room_id) => {
    socket.emit('RESET');
    socket.leave(room_id);
  });

  socket.on('disconnecting', () => {
    const [userSocket, currentRoomId] = Object.keys(socket.rooms);
    console.log(userSocket, currentRoomId);
    if(rooms[currentRoomId]){
      const currentParticipants = rooms[currentRoomId].participants;
      console.log(currentParticipants);
      const updatedParticipants = currentParticipants.filter(participant => participant.id !== userSocket);
      rooms[currentRoomId] = { ...rooms[currentRoomId], participants: updatedParticipants };
      io.sockets.in(currentRoomId).emit('ROOM_INFO', { room_id: currentRoomId, room: rooms[currentRoomId] });
    }
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
    let randomIndex = Math.floor(Math.random() * prompts.length);
    while(rooms[room_id].usedPrompts.includes(randomIndex)) {
      randomIndex = Math.floor(Math.random() * prompts.length);
    }

    const updatedParticipants = rooms[room_id].participants.map(participant => {
      if(participant.id === winner) {
        const newScore = participant.score + 1;
        if(newScore === 2) io.sockets.in(room_id).emit('GAME_WINNER', participant);
        return { ...participant, hasSelected: false, score: newScore };
      }
      return { ...participant, hasSelected: false };
    });

    const newRound = rooms[room_id].round + 1;

    // For 2 participants, when newRound = 0, Judge would be participants[0]
    const nextJudge = newRound < updatedParticipants.length
      ? rooms[room_id].participants[newRound]
      : rooms[room_id].participants[newRound % updatedParticipants.length];

    rooms[room_id] = { ...rooms[room_id], songQueue: [], judge: nextJudge, participants: updatedParticipants, round: newRound, currentPrompt: prompts[randomIndex] };

    io.sockets.in(room_id).emit('PAUSE');
    io.sockets.in(room_id).emit('ROOM_INFO', { room_id, room: rooms[room_id] });
  });
});

module.exports = server;
