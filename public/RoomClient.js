const mediaType = {
  audio: "audioType",
  video: "videoType",
  screen: "screenType",
};
const _EVENTS = {
  exitRoom: "exitRoom",
  openRoom: "openRoom",
  startVideo: "startVideo",
  stopVideo: "stopVideo",
  startAudio: "startAudio",
  stopAudio: "stopAudio",
  startScreen: "startScreen",
  stopScreen: "stopScreen",
};

var audioProducerId = null;
var videoProducerId = null;
var sysAudio = false;
let elem;
var userName = null;
var roomDetailsObj;

class RoomClient {
  constructor(
    localMediaEl,
    remoteVideoEl,
    remoteAudioEl,
    mediasoupClient,
    socket,
    room_id,
    name,
    successCallback
  ) {
    this.name = name;
    this.localMediaEl = localMediaEl;
    this.remoteVideoEl = remoteVideoEl;
    this.remoteAudioEl = remoteAudioEl;
    this.mediasoupClient = mediasoupClient;

    this.socket = socket;
    this.producerTransport = null;
    this.consumerTransport = null;
    this.device = null;
    this.room_id = room_id;

    this.isVideoOnFullScreen = false;
    this.isDevicesVisible = false;

    this.consumers = new Map();
    this.producers = new Map();

    console.log("Mediasoup client", mediasoupClient);

    /**
     * map that contains a mediatype as key and producer_id as value
     */
    this.producerLabel = new Map();

    this._isOpen = false;
    this.eventListeners = new Map();

    Object.keys(_EVENTS).forEach(
      function (evt) {
        this.eventListeners.set(evt, []);
      }.bind(this)
    );

    this.createRoom(room_id).then(
      async function () {
        await this.join(name, room_id);
        this.initSockets();
        this._isOpen = true;
        successCallback();
      }.bind(this)
    );
    userName = null;
  }

  ////////// INIT /////////



  async getparticipantList(room_id) {
    await this.socket.emit('updateRoom');
    await this.socket.on('roomUpdateBroadcast', () => {
      this.updateRoom(room_id);
    });

  }

  updateRoom(room_id) {
    var room_id_string = room_id.toString();
    socket.emit('getParticipantList', room_id_string, (roomDetails) => {
      if (roomDetails != null) {
        roomDetailsObj = JSON.parse(roomDetails);

        var participantList = document.getElementById("participantList");
        participantList.innerHTML = "";
        roomDetailsObj.forEach(participantElement => {
          if (participantElement.name == userName) { return; }
          var row = document.createElement("tr");
          var nameCell = document.createElement("td");
          nameCell.innerText = participantElement.name;

          var pauseAudioButtonCell = document.createElement("td");
          var pauseAudioButton = document.createElement("button");
          pauseAudioButton.innerText = "Mute Audio";
          pauseAudioButton.id = participantElement.id;
          pauseAudioButton.addEventListener("click", async function () {
            var producerIdcsv = pauseAudioButton.getAttribute("data-producerArray");
            const selectedProducerArray = producerIdcsv.split(',');
            var consumerArray = rc.getAudioConsumerId(selectedProducerArray);
            consumerArray.forEach(element => {
              rc.pauseConsumer(element);
            });
          });
          pauseAudioButtonCell.appendChild(pauseAudioButton);

          var resumeAudioButtonCell = document.createElement("td");
          var resumeAudioButton = document.createElement("button");
          resumeAudioButton.innerText = "Unmute Audio";
          resumeAudioButton.id = participantElement.id;
          resumeAudioButton.addEventListener("click", async function () {
            var producerIdcsv = resumeAudioButton.getAttribute("data-producerArray");
            const selectedProducerArray = producerIdcsv.split(',');
            var consumerArray = rc.getAudioConsumerId(selectedProducerArray);
            consumerArray.forEach(element => {
              rc.resumeConsumer(element);
            });
          });
          resumeAudioButtonCell.appendChild(resumeAudioButton);

          var pauseVideoButtonCell = document.createElement("td");
          var pauseVideoButton = document.createElement("button");
          pauseVideoButton.innerText = "Pause Video";
          pauseVideoButton.id = participantElement.id;
          pauseVideoButton.addEventListener("click", async function () {
            var producerIdcsv = pauseVideoButton.getAttribute("data-producerArray");
            const selectedProducerArray = producerIdcsv.split(',');
            var consumerArray = rc.getVideoConsumerId(selectedProducerArray);
            consumerArray.forEach(element => {
              rc.pauseConsumer(element);
            });
          });
          pauseVideoButtonCell.appendChild(pauseVideoButton);

          var resumeVideoButtonCell = document.createElement("td");
          var resumeVideoButton = document.createElement("button");
          resumeVideoButton.innerText = "Play Video";
          resumeVideoButton.id = participantElement.id;
          resumeVideoButton.addEventListener("click", async function () {
            var producerIdcsv = resumeVideoButton.getAttribute("data-producerArray");
            const selectedProducerArray = producerIdcsv.split(',');
            var consumerArray = rc.getVideoConsumerId(selectedProducerArray);
            consumerArray.forEach(element => {
              rc.resumeConsumer(element);
            });
          });
          resumeVideoButtonCell.appendChild(resumeVideoButton);

          row.appendChild(nameCell);
          row.appendChild(pauseAudioButtonCell);
          row.appendChild(resumeAudioButtonCell);
          row.appendChild(pauseVideoButtonCell);
          row.appendChild(resumeVideoButtonCell);
          participantList.appendChild(row);

          var producerArray = [];
          participantElement.producers.forEach(producerElement => {
            producerArray.push(producerElement[0]);
          });
          pauseAudioButton.setAttribute(`data-producerArray`, producerArray);
          resumeAudioButton.setAttribute(`data-producerArray`, producerArray);
          pauseVideoButton.setAttribute(`data-producerArray`, producerArray);
          resumeVideoButton.setAttribute(`data-producerArray`, producerArray);
        });
      }
    });
  }


  getAudioConsumerId(producerArr) {

    var confirmedConsumerArr = [];

    const divElement = document.querySelector('#remoteAudios');
    const audioElementsArr = divElement.getElementsByTagName('audio');

    for (let i = 0; i < audioElementsArr.length; i++) {
      const audioId = audioElementsArr[i].getAttribute('data-producer_id');
      var consumerId;

      producerArr.forEach(element => {
        if (element == audioId) {
          consumerId = audioElementsArr[i].getAttribute('id');
          // this.pauseConsumer(consumerId);
          confirmedConsumerArr.push(consumerId);
        }
      });
    }
    return confirmedConsumerArr;
  }


  getVideoConsumerId(producerArr) {

    var confirmedConsumerArr = [];

    const divElement = document.querySelector('#remoteVideos');
    const audioElementsArr = divElement.getElementsByTagName('video');

    for (let i = 0; i < audioElementsArr.length; i++) {
      const audioId = audioElementsArr[i].getAttribute('data-producer_id');
      var consumerId;

      producerArr.forEach(element => {
        if (element == audioId) {
          consumerId = audioElementsArr[i].getAttribute('id');
          // this.pauseConsumer(consumerId);
          confirmedConsumerArr.push(consumerId);
        }
      });
    }
    return confirmedConsumerArr;
  }


  async pauseConsumer(consumerId) {
    await this.socket.emit('pauseConsumer', consumerId);
  }

  async resumeConsumer(consumerId) {
    await this.socket.emit('resumeConsumer', consumerId);
  }


  async createRoom(room_id) {
    await this.socket
      .request("createRoom", {
        room_id,
      })
      .catch((err) => {
        console.log("Create room error:", err);
      });
  }

  async join(name, room_id) {
    socket
      .request("join", {
        name,
        room_id,
      })
      .then(
        async function (e) {
          console.log("Joined to room", e);
          const data = await this.socket.request("getRouterRtpCapabilities");
          let device = await this.loadDevice(data);
          this.device = device;
          await this.initTransports(device);
          this.socket.emit("getProducers");

          this.produce(RoomClient.mediaType.video, videoSelect.value);
          this.produce(RoomClient.mediaType.audio, audioSelect.value);

          userName = document.getElementById("nameInput").value;

          this.getparticipantList(room_id);

        }.bind(this)
      )
      .catch((err) => {
        console.log("Join error:", err);
      });
  }

  async loadDevice(routerRtpCapabilities) {
    let device;
    try {
      device = new this.mediasoupClient.Device();
    } catch (error) {
      if (error.name === "UnsupportedError") {
        console.error("Browser not supported");
        alert("Browser not supported");
      }
      console.error(error);
    }
    await device.load({
      routerRtpCapabilities,
    });
    return device;
  }

  async initTransports(device) {
    // init producerTransport
    {
      const data = await this.socket.request("createWebRtcTransport", {
        forceTcp: false,
        rtpCapabilities: device.rtpCapabilities,
      });

      if (data.error) {
        console.error(data.error);
        return;
      }

      this.producerTransport = device.createSendTransport(data);

      this.producerTransport.on(
        "connect",
        async function ({ dtlsParameters }, callback, errback) {
          this.socket
            .request("connectTransport", {
              dtlsParameters,
              transport_id: data.id,
            })
            .then(callback)
            .catch(errback);
        }.bind(this)
      );

      this.producerTransport.on(
        "produce",
        async function ({ kind, rtpParameters }, callback, errback) {
          try {
            const { producer_id } = await this.socket.request("produce", {
              producerTransportId: this.producerTransport.id,
              kind,
              rtpParameters,
            });
            callback({
              id: producer_id,
            });
          } catch (err) {
            errback(err);
          }
        }.bind(this)
      );

      this.producerTransport.on(
        "connectionstatechange",
        function (state) {
          switch (state) {
            case "connecting":
              break;

            case "connected":
              //localVideo.srcObject = stream
              break;

            case "failed":
              this.producerTransport.close();
              break;

            default:
              break;
          }
        }.bind(this)
      );
    }

    // init consumerTransport
    {
      const data = await this.socket.request("createWebRtcTransport", {
        forceTcp: false,
      });

      if (data.error) {
        console.error(data.error);
        return;
      }

      // only one needed
      this.consumerTransport = device.createRecvTransport(data);
      this.consumerTransport.on(
        "connect",
        function ({ dtlsParameters }, callback, errback) {
          this.socket
            .request("connectTransport", {
              transport_id: this.consumerTransport.id,
              dtlsParameters,
            })
            .then(callback)
            .catch(errback);
        }.bind(this)
      );

      this.consumerTransport.on(
        "connectionstatechange",
        async function (state) {
          switch (state) {
            case "connecting":
              break;

            case "connected":
              //remoteVideo.srcObject = await stream;
              //await socket.request('resume');
              break;

            case "failed":
              this.consumerTransport.close();
              break;

            default:
              break;
          }
        }.bind(this)
      );
    }
  }

  initSockets() {
    this.socket.on(
      "consumerClosed",
      function ({ consumer_id }) {
        console.log("Closing consumer:", consumer_id);
        this.removeConsumer(consumer_id);
      }.bind(this)
    );

    /**
     * data: [ {
     *  producer_id:
     *  producer_socket_id:
     * }]
     */
    this.socket.on(
      "newProducers",
      async function (data) {
        console.log("New producers", data);
        for (let { producer_id } of data) {
          await this.consume(producer_id);
        }
      }.bind(this)
    );

    this.socket.on(
      "disconnect",
      function () {
        this.exit(true);
      }.bind(this)
    );
  }

  //////// MAIN FUNCTIONS /////////////

  async replace(type, deviceId = null) {
    let mediaConstraints = {}
    let audio = false
    switch (type) {
      case mediaType.audio:
        mediaConstraints = {
          audio: {
            deviceId: deviceId
          },
          video: false
        }
        audio = true
        break
      case mediaType.video:
        mediaConstraints = {
          audio: false,
          video: {
            width: {
              min: 640,
              ideal: 1920
            },
            height: {
              min: 400,
              ideal: 1080
            },
            deviceId: deviceId
            /*aspectRatio: {
                            ideal: 1.7777777778
                        }*/
          }
        }
        break
      default:
        return
    }
    if (!this.device.canProduce('video') && !audio) {
      console.error('Cannot produce video')
      return
    }
    console.log('Mediacontraints:', mediaConstraints)
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia(mediaConstraints)

      const track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]

      const params = {
        track
      }

      if (!audio) {
        params.encodings = [
          {
            rid: 'r0',
            maxBitrate: 100000,
            //scaleResolutionDownBy: 10.0,
            scalabilityMode: 'S3T3'
          },
          {
            rid: 'r1',
            maxBitrate: 300000,
            scalabilityMode: 'S3T3'
          },
          {
            rid: 'r2',
            maxBitrate: 900000,
            scalabilityMode: 'S3T3'
          }
        ]
        params.codecOptions = {
          videoGoogleStartBitrate: 1000
        }
      }

      if (!this.producerLabel.has(type)) {
        console.log('There is no producer for this type ' + type)
        return
      }

      let producer_id = await this.producerLabel.get(type)

      producer = this.producers.get(producer_id);

      await producer.replaceTrack(params);

      if (!audio) {
        let elem = document.getElementById(producer_id);
        elem.srcObject = stream;
      }


    } catch (err) {
      console.log('Produce error:', err)
    }
  }


  async produce(type, deviceId = null) {
    let mediaConstraints = {};
    let audio = false;
    let screen = false;
    switch (type) {
      case mediaType.audio:
        mediaConstraints = {
          audio: {
            deviceId: deviceId,
          },
          video: false,
        };
        audio = true;
        break;
      case mediaType.video:
        mediaConstraints = {
          audio: false,
          video: {
            width: {
              min: 640,
              ideal: 1920,
            },
            height: {
              min: 400,
              ideal: 1080,
            },
            deviceId: deviceId,
            /*aspectRatio: {
                            ideal: 1.7777777778
                        }*/
          },
        };
        break;
      case mediaType.screen:
        audio = true;
        screen = true;
        break;
      default:
        return;
    }
    if (!this.device.canProduce("video") && !audio) {
      console.error("Cannot produce video");
      return;
    }
    if (this.producerLabel.has(type)) {
      console.log("Producer already exists for this type " + type);
      return;
    }
    console.log("Mediacontraints:", mediaConstraints);
    let stream;
    try {
      stream = screen
        ? await navigator.mediaDevices.getDisplayMedia({ audio: true })
        : await navigator.mediaDevices.getUserMedia(mediaConstraints);
      console.log(navigator.mediaDevices.getSupportedConstraints());

      console.log("stream.getAudioTracks()[0]", stream.getAudioTracks()[0]);
      console.log("stream.getVideoTracks()[0]", stream.getVideoTracks()[0]);

      if (stream.getAudioTracks()[0] != undefined && type == "screenType") sysAudio = true;

      var params = {};
      var params1 = {};
      var params2 = {};
      var track = null;

      if (screen == false) {
        track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
        params = {
          track,
        };
      } else {
        if (sysAudio) track = stream.getAudioTracks()[0];

        console.log("track", track);

        if (track !== null) {
          sysAudio = true;
          params1 = {
            track,
          };
        }

        track = stream.getVideoTracks()[0];

        params2 = {
          track,
        };
      }
      if (!audio && !screen) {
        params.encodings = [
          {
            rid: "r0",
            maxBitrate: 100000,
            //scaleResolutionDownBy: 10.0,
            scalabilityMode: "L1T3",
          },
          {
            rid: "r1",
            maxBitrate: 300000,
            scalabilityMode: "L1T3",
          },
          {
            rid: "r2",
            maxBitrate: 900000,
            scalabilityMode: "L1T3",
          },
        ];
        params.codecOptions = {
          videoGoogleStartBitrate: 1000,
        };
      }

      if (screen == false) {
        producer = await this.producerTransport.produce(params);
        console.log("Producer", producer);
        this.producers.set(producer.id, producer);
        if (!audio) {
          elem = document.createElement("video");
          elem.srcObject = stream;
          elem.id = producer.id;
          elem.playsinline = false;
          elem.autoplay = true;
          elem.muted = true;
          elem.className = "vid";
          this.localMediaEl.appendChild(elem);
          this.handleFS(elem.id);
        }

        producer.on("trackended", () => {
          this.closeProducer(type);
        });

        producer.on("transportclose", () => {
          console.log("Producer transport close");
          if (!audio) {
            elem.srcObject.getTracks().forEach(function (track) {
              track.stop();
            });
            elem.parentNode.removeChild(elem);
          }
          this.producers.delete(producer.id);
        });

        producer.on("close", () => {
          console.log("Closing producer");
          if (!audio) {
            elem.srcObject.getTracks().forEach(function (track) {
              track.stop();
            });
            elem.parentNode.removeChild(elem);
          }
          this.producers.delete(producer.id);
        });

        this.producerLabel.set(type, producer.id);

        switch (type) {
          case mediaType.audio:
            this.event(_EVENTS.startAudio);
            break;
          case mediaType.video:
            this.event(_EVENTS.startVideo);
            break;
          case mediaType.screen:
            this.event(_EVENTS.startScreen);
            break;
          default:
            return;
        }
      } else {
        if (sysAudio) {
          params = params1;
          producer = await this.producerTransport.produce(params);
          console.log("Producer", producer);
          this.producers.set(producer.id, producer);

          audioProducerId = producer.id;

          producer.on("trackended", () => {
            this.closeProducer(type);
          });

          producer.on("transportclose", () => {
            console.log("Producer transport close");
            if (!audio) {
              elem.srcObject.getTracks().forEach(function (track) {
                track.stop();
              });
              elem.parentNode.removeChild(elem);
            }
            this.producers.delete(producer.id);
          });

          producer.on("close", () => {
            console.log("Closing producer");
            if (!audio) {
              elem.srcObject.getTracks().forEach(function (track) {
                track.stop();
              });
              elem.parentNode.removeChild(elem);
            }
            this.producers.delete(producer.id);
          });

          this.producerLabel.set(type, producer.id);

          switch (type) {
            case mediaType.audio:
              this.event(_EVENTS.startAudio);
              break;
            case mediaType.video:
              this.event(_EVENTS.startVideo);
              break;
            case mediaType.screen:
              this.event(_EVENTS.startScreen);
              break;
            default:
              return;
          }
        }

        params = params2;
        producer = await this.producerTransport.produce(params);
        console.log("Producer", producer);
        this.producers.set(producer.id, producer);

        videoProducerId = producer.id;

        // elem = document.createElement("video");
        // elem.srcObject = stream;
        // elem.id = producer.id;
        // elem.playsinline = false;
        // elem.autoplay = true;
        // elem.muted = true;
        // elem.className = "vid";
        // this.localMediaEl.appendChild(elem);
        // this.handleFS(elem.id);

        producer.on("trackended", () => {
          this.closeProducer(type);
        });

        producer.on("transportclose", () => {
          console.log("Producer transport close");
          if (!audio) {
            elem.srcObject.getTracks().forEach(function (track) {
              track.stop();
            });
            elem.parentNode.removeChild(elem);
          }
          this.producers.delete(producer.id);
        });

        producer.on("close", () => {
          console.log("Closing producer");
          if (!audio) {
            elem.srcObject.getTracks().forEach(function (track) {
              track.stop();
            });
            elem.parentNode.removeChild(elem);
          }
          this.producers.delete(producer.id);
        });

        this.producerLabel.set(type, producer.id);

        switch (type) {
          case mediaType.audio:
            this.event(_EVENTS.startAudio);
            break;
          case mediaType.video:
            this.event(_EVENTS.startVideo);
            break;
          case mediaType.screen:
            this.event(_EVENTS.startScreen);
            break;
          default:
            return;
        }
      }
    } catch (err) {
      console.log("Produce error:", err);
    }
  }

  async consume(producer_id) {
    this.updateRoom(this.room_id);
    //let info = await this.roomInfo()

    this.getConsumeStream(producer_id).then(
      function ({ consumer, stream, kind }) {
        this.consumers.set(consumer.id, consumer);

        let elem;
        if (kind === "video") {

          const newParentDiv = document.createElement("div");
          newParentDiv.className = "parent-div";
          newParentDiv.setAttribute("data-RemVidConId", consumer.id);
          newParentDiv.setAttribute("data-RemVidProId", producer_id);
          const newChild1Div = document.createElement("div");
          newChild1Div.className = "child-div1";
          const elem = document.createElement("video");
          elem.srcObject = stream;
          elem.id = consumer.id;
          let name = "";
          roomDetailsObj.forEach((userArr) => {
            userArr.producers.forEach((producerArr) => {
              if (producerArr[0] == producer_id) {
                name = userArr.name;
              }
            });
          });
          elem.setAttribute("data-user_name", name);
          elem.setAttribute("data-producer_id", producer_id);
          elem.playsinline = false;
          elem.autoplay = true;
          elem.className = "vidRem";
          newChild1Div.appendChild(elem);
          newParentDiv.appendChild(newChild1Div);
          this.remoteVideoEl.appendChild(newParentDiv);
          this.handleFS(elem.id);
          const newChild2Div = document.createElement("div");
          newChild2Div.className = "child-div2";
          const Pname = document.createElement("p");
          Pname.textContent = name;
          newChild2Div.appendChild(Pname);
          newParentDiv.appendChild(newChild2Div);


        } else {
          elem = document.createElement("audio");
          elem.srcObject = stream;
          elem.id = consumer.id;
          elem.setAttribute("data-producer_id", producer_id);
          elem.playsinline = false;
          elem.autoplay = true;
          this.remoteAudioEl.appendChild(elem);
        }

        this.getparticipantList(this.room_id);

        consumer.on(
          "trackended",
          function () {
            this.removeConsumer(consumer.id);
          }.bind(this)
        );

        consumer.on(
          "transportclose",
          function () {
            this.removeConsumer(consumer.id);
          }.bind(this)
        );
      }.bind(this)
    );
  }

  async getConsumeStream(producerId) {
    const { rtpCapabilities } = this.device;
    const data = await this.socket.request("consume", {
      rtpCapabilities,
      consumerTransportId: this.consumerTransport.id, // might be
      producerId,
    });
    const { id, kind, rtpParameters } = data;

    let codecOptions = {};
    const consumer = await this.consumerTransport.consume({
      id,
      producerId,
      kind,
      rtpParameters,
      codecOptions,
    });

    const stream = new MediaStream();
    stream.addTrack(consumer.track);

    return {
      consumer,
      stream,
      kind,
    };
  }

  closeProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log("There is no producer for this type " + type);
      return;
    }



    let producer_id = this.producerLabel.get(type);
    console.log("this", this);
    console.log("Close producer", producer_id);

    this.socket.emit("producerClosed", {
      producer_id,
    });

    this.producers.get(producer_id).close();
    this.producers.delete(producer_id);
    this.producerLabel.delete(type);

    if (type == mediaType.video) {
      let elem = document.getElementById(producer_id);
      console.log("**********", elem.srcObject);
      elem.srcObject.getTracks().forEach(function (track) {
        track.stop();
      });
      elem.parentNode.removeChild(elem);
    }

    switch (type) {
      case mediaType.audio:
        this.event(_EVENTS.stopAudio);
        break;
      case mediaType.video:
        this.event(_EVENTS.stopVideo);
        break;
      case mediaType.screen:
        sysAudio = false;
        this.event(_EVENTS.stopScreen);
        break;
    }
    console.log(audioProducerId);
    if (audioProducerId != null && type == "screenType" && sysAudio) {
      let producer_id = audioProducerId;
      console.log("audioProducerId", audioProducerId);
      console.log("Close producer", producer_id);

      this.socket.emit("producerClosed", {
        producer_id,
      });

      this.producers.get(producer_id).close();
      this.producers.delete(producer_id);
      this.producerLabel.delete(type);

      switch (type) {
        case mediaType.audio:
          this.event(_EVENTS.stopAudio);
          break;
        case mediaType.video:
          this.event(_EVENTS.stopVideo);
          break;
        case mediaType.screen:
          this.event(_EVENTS.stopScreen);
          break;
        default:
          return;
      }
    }
    if (type == "screenType") {
      videoProducerId = null;
      audioProducerId = null;
    }
  }

  pauseProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log("There is no producer for this type " + type);
      return;
    }

    let producer_id = this.producerLabel.get(type);
    this.producers.get(producer_id).pause();
  }

  resumeProducer(type) {
    if (!this.producerLabel.has(type)) {
      console.log("There is no producer for this type " + type);
      return;
    }

    let producer_id = this.producerLabel.get(type);
    this.producers.get(producer_id).resume();
  }

  removeConsumer(consumer_id) {
    // let elem = document.getElementById(consumer_id);
    // elem.srcObject.getTracks().forEach(function (track) {
    //   track.stop();
    // });
    // elem.parentNode.removeChild(elem);
    const myDiv = document.querySelector(`[data-RemVidConId="${consumer_id}"]`);
    myDiv.remove();

    this.consumers.delete(consumer_id);
  }

  exit(offline = false) {
    // if (videoProducerId != null) {
    //   let elem = document.getElementById(videoProducerId);
    //   console.log("elem.srcObject", elem.srcObject);
    //   elem.srcObject.getTracks().forEach(function (track) {
    //     track.stop();
    //   });
    //   elem.parentNode.removeChild(elem);
    // }

    const myDiv = document.querySelector(`[data-RemVidProId="${videoProducerId}"]`);
    if (myDiv != null)
      myDiv.remove();

    sysAudio = false;

    let clean = function () {
      this._isOpen = false;
      this.consumerTransport.close();
      this.producerTransport.close();
      this.socket.off("disconnect");
      this.socket.off("newProducers");
      this.socket.off("consumerClosed");
    }.bind(this);

    if (!offline) {
      this.socket
        .request("exitRoom")
        .then((e) => console.log(e))
        .catch((e) => console.warn(e))
        .finally(
          function () {
            clean();
          }.bind(this)
        );
    } else {
      clean();
    }
    this.getparticipantList(this.room_id);
    this.event(_EVENTS.exitRoom);
  }

  ///////  HELPERS //////////

  async roomInfo() {
    let info = await this.socket.request("getMyRoomInfo");
    return info;
  }

  static get mediaType() {
    return mediaType;
  }

  event(evt) {
    if (this.eventListeners.has(evt)) {
      this.eventListeners.get(evt).forEach((callback) => callback());
    }
  }

  on(evt, callback) {
    this.eventListeners.get(evt).push(callback);
  }

  //////// GETTERS ////////

  isOpen() {
    return this._isOpen;
  }

  static get EVENTS() {
    return _EVENTS;
  }

  //////// UTILITY ////////

  copyURL() {
    let tmpInput = document.createElement("input");
    document.body.appendChild(tmpInput);
    tmpInput.value = window.location.href;
    tmpInput.select();
    document.execCommand("copy");
    document.body.removeChild(tmpInput);
    console.log("URL copied to clipboard 👍");
  }

  showDevices() {
    if (!this.isDevicesVisible) {
      reveal(devicesList);
      this.isDevicesVisible = true;
    } else {
      hide(devicesList);
      this.isDevicesVisible = false;
    }
  }

  handleFS(id) {
    let videoPlayer = document.getElementById(id);
    videoPlayer.addEventListener("fullscreenchange", (e) => {
      if (videoPlayer.controls) return;
      let fullscreenElement = document.fullscreenElement;
      if (!fullscreenElement) {
        videoPlayer.style.pointerEvents = "auto";
        this.isVideoOnFullScreen = false;
      }
    });
    videoPlayer.addEventListener("webkitfullscreenchange", (e) => {
      if (videoPlayer.controls) return;
      let webkitIsFullScreen = document.webkitIsFullScreen;
      if (!webkitIsFullScreen) {
        videoPlayer.style.pointerEvents = "auto";
        this.isVideoOnFullScreen = false;
      }
    });
    videoPlayer.addEventListener("click", (e) => {
      if (videoPlayer.controls) return;
      if (!this.isVideoOnFullScreen) {
        if (videoPlayer.requestFullscreen) {
          videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) {
          videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.msRequestFullscreen) {
          videoPlayer.msRequestFullscreen();
        }
        this.isVideoOnFullScreen = true;
        videoPlayer.style.pointerEvents = "none";
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitCancelFullScreen) {
          document.webkitCancelFullScreen();
        } else if (document.msExitFullscreen) {
          document.msExitFullscreen();
        }
        this.isVideoOnFullScreen = false;
        videoPlayer.style.pointerEvents = "auto";
      }
    });
  }
}
