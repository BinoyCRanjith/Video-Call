if (location.href.substr(0, 5) !== "https")
  location.href = "https" + location.href.substr(4, location.href.length - 4);

const socket = io();

let producer = null;

nameInput.value = "user_" + Math.round(Math.random() * 1000);

socket.request = function request(type, data = {}) {
  return new Promise((resolve, reject) => {
    socket.emit(type, data, (data) => {
      if (data.error) {
        reject(data.error);
      } else {
        resolve(data);
      }
    });
  });
};

let rc = null;
// const UserDetail = ({
//   // type: `${kind}`,
//   name: `${roomList.get(socket.room_id).getPeers().get(socket.id).name}`
//   // id: `${producer_id}`
// })

function joinRoom(name, room_id) {
  if (rc && rc.isOpen()) {
    console.log("Already connected to a room");
  } else {
    initEnumerateDevices();
    // UserDetails();

    rc = new RoomClient(
      localMedia,
      remoteVideos,
      remoteAudios,
      window.mediasoupClient,
      socket,
      room_id,
      name,
      roomOpen
    );

    addListeners();
  }
}

function roomOpen() {
  login.className = "hidden";
  reveal(startAudioButton);
  hide(stopAudioButton);
  reveal(startVideoButton);
  hide(stopVideoButton);
  reveal(startScreenButton);
  hide(stopScreenButton);
  reveal(exitButton);
  reveal(copyButton);
  reveal(devicesButton);
  control.className = "";
  reveal(videoMedia);
}

function hide(elem) {
  elem.className = "hidden";
}

function reveal(elem) {
  elem.className = "";
}

function addListeners() {
  debugger;
  rc.on(RoomClient.EVENTS.startScreen, () => {
    hide(startScreenButton);
    reveal(stopScreenButton);
  });

  rc.on(RoomClient.EVENTS.stopScreen, () => {
    hide(stopScreenButton);
    reveal(startScreenButton);
  });

  rc.on(RoomClient.EVENTS.stopAudio, () => {
    hide(stopAudioButton);
    reveal(startAudioButton);
  });
  rc.on(RoomClient.EVENTS.startAudio, () => {
    hide(startAudioButton);
    reveal(stopAudioButton);
  });

  rc.on(RoomClient.EVENTS.startVideo, () => {
    hide(startVideoButton);
    reveal(stopVideoButton);
  });
  rc.on(RoomClient.EVENTS.stopVideo, () => {
    hide(stopVideoButton);
    reveal(startVideoButton);
  });
  rc.on(RoomClient.EVENTS.exitRoom, () => {
    hide(control);
    hide(devicesList);
    hide(videoMedia);
    hide(copyButton);
    hide(devicesButton);
    reveal(login);
  });
}

let isEnumerateAudioDevices = false;
let isEnumerateVideoDevices = false;

function initEnumerateDevices() {
  // Many browsers, without the consent of getUserMedia, cannot enumerate the devices.
  debugger;
  const constraints = {
    audio: true,
    video: true,
  };

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      enumerateDevices();
      stream.getTracks().forEach(function (track) {
        track.stop();
      });
    })
    .catch((err) => {
      console.error("Access denied for audio/video: ", err);
    });
}

function enumerateDevices() {
  debugger;
  if (!isEnumerateVideoDevices) {
    // Load mediaDevice options
    navigator.mediaDevices.enumerateDevices().then((devices) =>
      devices.forEach((device) => {
        let el = null;
        if ("videoinput" === device.kind) {
          el = videoSelect;
          if (!el) return;

          let option = document.createElement("option");
          option.value = device.deviceId;
          option.innerText = device.label;
          el.appendChild(option);
        }
      })
    );
    isEnumerateVideoDevices = true;
  }

  if (!isEnumerateAudioDevices) {
    navigator.mediaDevices.enumerateDevices().then((devices) =>
      devices.forEach((device) => {
        let el = null;

        if ("audioinput" === device.kind) {
          el = audioSelect;
          if (!el) return;

          let option = document.createElement("option");
          option.value = device.deviceId;
          option.innerText = device.label;
          el.appendChild(option);
        }
      })
    );
    isEnumerateAudioDevices = true;
  }
}
// console.log('Produce', {
//   type: `${kind}`,
//   name: `${roomList.get(socket.room_id).getPeers().get(socket.id).name}`,
//   id: `${producer_id}`
// })
// function UserDetails()
// {
//   debugger;
//   const userList = document.getElementById('user-list');
//   const ul = document.createElement('ul');

//   devices.forEach(UserDetail => {
//     const li = document.createElement('li');
//     li.textContent = `Name: ${UserDetail.name}`;
//     ul.appendChild(li);
//   });

// userList.appendChild(ul);

// }
