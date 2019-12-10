import React, { useState, useEffect } from "react";
// import logo from './logo.svg';
// import './App.css';
import Video from "./component/Video";

declare const Owt: any;
const conference = new Owt.Conference.ConferenceClient();

const names = [
  "Oliver",
  "Jack",
  "Harry",
  "Jacob",
  "James",
  "John",
  "Robert",
  "Michael"
];
const userName = names[Math.floor(Math.random() * names.length)];
const roomId = "251260606233969163";

let LOCAL_STREAM: any;
let PUBLISHED_STREAM: any;

const App: React.FC = () => {
  // const [hasRoomId, setHasRoomId] = useState(false);
  const [token, setToken] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mixedMediaStream, setMixedMediaStream] = useState("");

  // get room id from localStorage
  // useEffect(() => {
  //   const roomId = localStorage.getItem("roomId");
  //   if (roomId) setHasRoomId(true);
  // }, []);

  // check permission of devices
  useEffect(() => {
    checkPermission().then(r => {
      setHasPermission(r);
      if (r) handleGetStream();
    });
  }, []);

  // get token if there is room id and has permission of devices
  useEffect(() => {
    if (hasPermission) {
      // const roomId = localStorage.getItem("roomId");
      // if (roomId) handleCreateToken();
      handleCreateToken();
    }
  }, [hasPermission]);

  useEffect(() => {
    return function cleanup() {
      if (conference) conference.leave();
      if (PUBLISHED_STREAM) PUBLISHED_STREAM.stop();
    };
  }, []);

  useEffect(() => {
    // via https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload
    function handleUnload() {
      if (conference) conference.leave();
      if (PUBLISHED_STREAM) PUBLISHED_STREAM.stop();
    }
    window.addEventListener("unload", handleUnload);

    return function cleanup() {
      window.removeEventListener("unload", handleUnload);
    };
  }, []);

  // async function handleCreateRoomId() {
  //   try {
  //     console.time("room-create");
  //     const res = await fetch("/api/room-create");
  //     console.timeEnd("room-create");
  //     const data = await res.json();
  //     const roomRef = JSON.parse(data.roomRef);
  //     const roomId = roomRef["@ref"].id;
  //     console.log("Got a roomId:", roomId);
  //     localStorage.setItem("roomId", roomId);
  //     setHasRoomId(true);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  async function handleCreateToken() {
    try {
      // const roomId = localStorage.getItem("roomId");
      console.log("Join room:", roomId);
      console.time("token-create");
      const res = await fetch("/api/token-create", {
        method: "POST",
        body: JSON.stringify({ roomId, userName })
      });
      console.timeEnd("token-create");
      const data = await res.json();
      const token = data.token;
      console.log("Token:", token);
      setToken(token);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleMixStreamToRoom(roomId: string, streamId: string) {
    try {
      await fetch("/api/stream-mix", {
        method: "POST",
        body: JSON.stringify({ roomId, streamId })
      });
    } catch (err) {
      console.log(err);
    }
  }

  async function handleJoinRoom() {
    try {
      if (token) {
        const info = await conference.join(token);
        console.log("Conference info:", info);
        setIsJoined(true);

        // sub remote mix stream
        const streams = info.remoteStreams;
        let mixedStream;
        for (const stream of streams) {
          if (
            stream.source.audio === "mixed" ||
            stream.source.video === "mixed"
          ) {
            mixedStream = stream;
            console.log("MixedStream:", mixedStream);
          }
        }
        const mixStream = await handleSubscribeStream(mixedStream);
        setMixedMediaStream(mixStream);

        // pub local stream
        const toPublishStream = new Owt.Base.LocalStream(
          LOCAL_STREAM,
          new Owt.Base.StreamSourceInfo("mic", "camera")
        );
        const stream = await conference.publish(toPublishStream, {
          audio: [{ codec: { name: "opus" }, maxBitrate: 300 }],
          video: [{ codec: { name: "h264" }, maxBitrate: 2048 }]
        });
        stream.addEventListener("error", (err: any) => {
          console.log("Publication error: " + err.error.message);
        });
        console.log("published stream:", stream);
        PUBLISHED_STREAM = stream;

        // mix stream
        await handleMixStreamToRoom(roomId, stream.id);
      }
    } catch (err) {
      console.log(err);
    }
  }

  async function handleGetStream() {
    try {
      LOCAL_STREAM = await getStream();
      console.log("LOCAL_STREAM:", LOCAL_STREAM);
      setHasPermission(true);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleSubscribeStream(stream: any) {
    try {
      const subscription = await conference.subscribe(stream, {
        audio: { codecs: [{ name: "opus" }] },
        video: { codecs: [{ name: "h264" }] }
      });
      console.log("Subscription info:", subscription);
      subscription.addEventListener("error", (err: any) => {
        console.log("Subscription error: " + err.error.message);
      });
      return stream.mediaStream;
    } catch (e) {
      console.log("handleSubscribe error:", e);
    }
  }

  if (isJoined) {
    if (mixedMediaStream) {
      return (
        <div style={{ textAlign: "center" }}>
          <div className="video-frame">
            <Video stream={mixedMediaStream} muted={false} />
          </div>
        </div>
      );
    } else {
      return <div>Joined room.</div>;
    }
  }

  if (hasPermission) {
    return (
      <div>
        <button onClick={handleJoinRoom} disabled={!token}>
          Join Room
        </button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={handleGetStream}>getStream</button>
    </div>
  );
};

async function checkPermission(): Promise<boolean> {
  let result = false;

  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return false;
  }

  const devices = await navigator.mediaDevices.enumerateDevices();
  devices.forEach(device => {
    if (device.label) result = true;
  });

  console.log("hasPermission:", result);
  return result;
}

async function getStream() {
  const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(
    Owt.Base.AudioSourceInfo.MIC
  );
  const videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(
    Owt.Base.VideoSourceInfo.CAMERA
  );
  // videoConstraintsForCamera.resolution = new Owt.Base.Resolution(1280, 720);
  // if (audioInputDeviceId) {
  //   audioConstraintsForMic.deviceId = audioInputDeviceId
  // }
  // if (videoInputDeviceId) {
  //   videoConstraintsForCamera.deviceId = videoInputDeviceId
  // }

  return await Owt.Base.MediaStreamFactory.createMediaStream(
    new Owt.Base.StreamConstraints(
      audioConstraintsForMic,
      videoConstraintsForCamera
    )
  );
}

// const App: React.FC = () => {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.tsx</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
