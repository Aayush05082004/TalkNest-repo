const socket = io('/');
const videoGrid = document.getElementById('video-grid');
const myVideo = document.createElement('video');
// myVideo.muted = true;
const muteButton = document.getElementById('muteButton');
const videoButton = document.getElementById('videoButton');
const leaveButton = document.getElementById('leaveButton');
const chatToggle = document.getElementById('chatToggle');
const chatContainer = document.querySelector('.chat-container');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let myVideoStream;
let myAudioEnabled = true;
let myVideoEnabled = true;
const peers = {};

navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true,
}).then(stream => {
  myVideoStream = stream;
  addVideoStream(myVideo, stream);

  const peer = new Peer(undefined, {
  path: '/peerjs',
  host: window.location.hostname,
  port: window.location.protocol === 'https:' ? 443 : 3030,
});


  peer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id, USERNAME);
  });

  socket.on('user-connected', (userId, username) => {
  setTimeout(() => {
    connectToNewUser(userId, stream);
  }, 1000);
});


  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close();
  });

  peer.on('call', call => {
    call.answer(stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
  });

  function connectToNewUser(userId, stream) {
    const call = peer.call(userId, stream);
    const video = document.createElement('video');
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream);
    });
    call.on('close', () => {
      video.remove();
    });

    peers[userId] = call;
  }

  function addVideoStream(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
      video.play();
    });
    videoGrid.append(video);
  }
}).catch(error => {
  alert('Failed to access camera and microphone. Please allow permissions.');
  console.error(error);
});



muteButton.addEventListener('click', () => {
  myAudioEnabled = !myAudioEnabled;
  myVideoStream.getAudioTracks()[0].enabled = myAudioEnabled;
  muteButton.innerHTML = myAudioEnabled
    ? '<i class="fas fa-microphone"></i> Mute'
    : '<i class="fas fa-microphone-slash"></i> Unmute';
});

videoButton.addEventListener('click', () => {
  myVideoEnabled = !myVideoEnabled;
  myVideoStream.getVideoTracks()[0].enabled = myVideoEnabled;
  videoButton.innerHTML = myVideoEnabled
    ? '<i class="fas fa-video"></i> Stop Video'
    : '<i class="fas fa-video-slash"></i> Play Video';
});

leaveButton.addEventListener('click', () => {
  window.location.href = '/';
});

chatToggle.addEventListener('click', () => {
  chatContainer.classList.toggle('hidden');
});


chatInput.addEventListener('keypress', e => {
  if (e.key === 'Enter' && chatInput.value.trim()) {
    const msg = chatInput.value;
    chatMessages.innerHTML += `<div>You: ${msg}</div>`;
    socket.emit('message', { username: USERNAME, text: msg });
    chatInput.value = '';
  }
});


socket.on('createMessage', (msg) => {
  chatMessages.innerHTML += `<div><strong>${msg.username}</strong>: ${msg.text}</div>`;
});

const participantsToggle = document.getElementById('participantsToggle');
const participantsContainer = document.querySelector('.participants-container');
const participantsList = document.getElementById('participantsList');

participantsToggle.addEventListener('click', () => {
  participantsContainer.classList.toggle('hidden');
});

socket.on('participants-update', participants => {
  participantsList.innerHTML = '';
  participants.forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;
    participantsList.appendChild(li);
  });
});

