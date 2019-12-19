import React, { useState, useEffect, useCallback } from "react";
import { RouteComponentProps, navigate } from "@reach/router";
import Video from "../component/Video";
import Button from "../component/Button";
import { Formik, Form, Field } from "formik";
import { VolumeMeterCanvas } from "../component/VolumeMeter";
import { useStore } from "../store";
import { useLogRoomJoined, useLogRoomDuration } from "../hook/useLog";

let RENDER_COUNTER = 1; // max: 8, 10

declare const Owt: any;
const conference = new Owt.Conference.ConferenceClient();

const DEFAULT_ROOM_ID = "251260606233969163";

// let LOCAL_STREAM: any;
let PUBLISHED_STREAM: any;

interface Props
  extends RouteComponentProps<{
    roomId: string;
  }> {}

const Room = (props: Props) => {
  console.log("RENDER_COUNTER:", RENDER_COUNTER++);
  const { roomId = DEFAULT_ROOM_ID } = props;

  const [token, setToken] = useState("");
  const [isLoadingToken, setLoadingToken] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  // const [mixedMediaStream, setMixedMediaStream] = useState("");
  // const [localStream, setLocalStream] = useState("");
  const [isLoadingLocalStream, setIsLoadingLocalStream] = useState(false);
  // const [userName, setUserName] = useState("");
  // const [isMute, setMute] = useState(false);
  const [hasNotFoundError, setHasNotFoundError] = useState(false);
  const [hasNotAllowedError, setHasNotAllowedError] = useState(false);
  const [error, setError] = useState("");

  // const hasPermission: boolean = useStore(state => state.hasPermission);
  // const setHasPermission = useStore(state => state.setHasPermission);
  const localStream: MediaStream = useStore(state => state.localStream);
  const setLocalStream = useStore(state => state.setLocalStream);
  // const token: string = useStore(state => state.token);
  // const setToken = useStore(state => state.setToken);
  const userName: string = useStore(state => state.userName);
  const setUserName = useStore(state => state.setUserName);
  const mixedMediaStream = useStore(state => state.mixedMediaStream);
  const setMixedMediaStream = useStore(state => state.setMixedMediaStream);
  const isMicMuted: boolean = useStore(state => state.isMicMuted);
  const setMicMuted = useStore(state => state.setMicMuted);

  useLogRoomJoined({ roomId });
  useLogRoomDuration({ roomId });

  useEffect(() => {
    if (!localStream) return;
    console.log("localStream:", localStream);
    const trackers = localStream.getVideoTracks();
    trackers.forEach(t => {
      const constraints = t.getConstraints();
      console.log("localstream resolution:", constraints);
    });
  }, [localStream]);

  const handleGetStream = useCallback(async () => {
    try {
      setIsLoadingLocalStream(true);
      const localStream = await getStream();
      setHasPermission(true);
      setLocalStream(localStream);
      setIsLoadingLocalStream(false);
    } catch (err) {
      console.log(err);
      setIsLoadingLocalStream(false);
      const name = err.name;

      if (name === "NotFoundError") {
        setHasNotFoundError(true);
      } else if (name === "NotAllowedError") {
        setHasNotAllowedError(true);
      } else if (name === "OverconstrainedError") {
        handleGetStream();
      }
    }
  }, [setLocalStream]);

  const handleCreateToken = useCallback(async () => {
    try {
      setLoadingToken(true);
      console.log("Join room:", roomId);
      console.time("token-create");
      const res = await fetch("/api/token-create", {
        method: "POST",
        body: JSON.stringify({ roomId, userName })
      });
      console.timeEnd("token-create");
      const data = await res.json();
      if (data.statusCode === 404) {
        if (data.message === "NotFound") {
          throw new Error("roomId not found");
        }
      } else {
        const token: string = data.token;
        console.log("Token:", token);
        setToken(token);
        setLoadingToken(false);
        return token;
      }
    } catch (err) {
      setError(err.message);
    }
  }, [roomId, userName]);

  // check permission of devices
  useEffect(() => {
    checkPermission().then(result => {
      const { hasPermission, hasDeviceInput } = result;
      if (!hasDeviceInput) setHasNotFoundError(true);
      setHasPermission(hasPermission);
      if (hasPermission) handleGetStream();
    });
  }, [handleGetStream]);

  // get username
  useEffect(() => {
    const userName = localStorage.getItem("userName");
    if (userName) setUserName(userName);
  }, [setUserName]);

  // get token if there is room id and has permission of devices
  useEffect(() => {
    if (hasPermission && userName) {
      handleCreateToken();
    }
  }, [hasPermission, userName, handleCreateToken]);

  useEffect(() => {
    return function cleanup() {
      if (isJoined) {
        if (conference) conference.leave();
        if (PUBLISHED_STREAM) PUBLISHED_STREAM.stop();
      }
    };
  }, [isJoined]);

  useEffect(() => {
    return function cleanup() {
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, [localStream]);

  useEffect(() => {
    // via https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload
    function handleUnload() {
      if (isJoined) {
        if (conference) conference.leave();
        if (PUBLISHED_STREAM) PUBLISHED_STREAM.stop();
      }
    }
    window.addEventListener("unload", handleUnload);

    return function cleanup() {
      window.removeEventListener("unload", handleUnload);
    };
  }, [isJoined]);

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

  async function handleJoinRoom(token: string) {
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
            stream.id.includes("common") &&
            (stream.source.audio === "mixed" || stream.source.video === "mixed")
          ) {
            mixedStream = stream;
            console.log("MixedStream:", mixedStream);
          }
        }
        const mixStream = await handleSubscribeStream(mixedStream);
        setMixedMediaStream(mixStream);

        // pub local stream
        const toPublishStream = new Owt.Base.LocalStream(
          localStream,
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
      setToken("");
      console.log(err.name); // Error
      console.log(err.message); // Expired || Unknown
      if (err.message === "Expired") {
        const token = await handleCreateToken();
        if (token) handleJoinRoom(token);
      }
    }
  }

  // async function handleGetStream() {
  //   try {
  //     setIsLoadingLocalStream(true);
  //     LOCAL_STREAM = await getStream();
  //     console.log("LOCAL_STREAM:", LOCAL_STREAM);
  //     setHasPermission(true);
  //     setLocalStream(LOCAL_STREAM);
  //     setIsLoadingLocalStream(false);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

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

  const handleToggleAudio = useCallback(async () => {
    isMicMuted
      ? await PUBLISHED_STREAM.unmute("audio")
      : await PUBLISHED_STREAM.mute("audio");
    setMicMuted(!isMicMuted);
  }, [isMicMuted, setMicMuted]);

  if (error) {
    return <div>{error}</div>;
  }

  if (hasNotFoundError) {
    return <div>NotFoundError</div>;
  }

  if (hasNotAllowedError) {
    return <div>NotAllowedError</div>;
  }

  if (isJoined) {
    if (mixedMediaStream) {
      return (
        <div>
          <div>
            <Video stream={mixedMediaStream} muted={false} />
            {!isMicMuted && <VolumeMeterCanvas localStream={localStream} />}
          </div>
          <div>
            <Button onClick={handleToggleAudio}>
              {isMicMuted ? "unmute" : "mute"}
            </Button>
            <Button onClick={() => navigate("/")}>Leave</Button>
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
        {localStream && (
          <div>
            <Video stream={localStream} muted={true} />
            <VolumeMeterCanvas localStream={localStream} />
          </div>
        )}
        {userName ? (
          <div>
            {userName}{" "}
            <Button
              onClick={() => {
                setUserName("");
                setToken("");
              }}
            >
              Change
            </Button>
          </div>
        ) : (
          <Formik
            initialValues={{ userName: "" }}
            onSubmit={(values, { setSubmitting }) => {
              localStorage.setItem("userName", values.userName);
              setUserName(values.userName);
            }}
          >
            {({ isSubmitting }) => (
              <Form>
                <Field
                  type="text"
                  name="userName"
                  placeholder="Your username"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  Submit
                </Button>
              </Form>
            )}
          </Formik>
        )}
        <Button
          onClick={() => handleJoinRoom(token)}
          disabled={!token || !userName}
          loading={isLoadingToken}
        >
          Join Room
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button
        onClick={handleGetStream}
        disabled={isLoadingLocalStream}
        loading={isLoadingLocalStream}
      >
        getStream
      </Button>
    </div>
  );
};

async function checkPermission(): Promise<{
  hasPermission: boolean;
  hasDeviceInput: boolean;
}> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    return {
      hasPermission: false,
      hasDeviceInput: false
    };
  }

  const devices = await navigator.mediaDevices.enumerateDevices();

  const hasPermission = devices.some(device => device.label !== "");
  const hasAudioInput = devices.some(device => device.kind === "audioinput");
  const hasVideoInput = devices.some(device => device.kind === "videoinput");

  console.log("devices:", devices);
  console.log("hasPermission:", hasPermission);
  console.log("hasAudioInput:", hasAudioInput);
  console.log("hasVideoInput:", hasVideoInput);

  return {
    hasPermission,
    hasDeviceInput: hasAudioInput && hasVideoInput
  };
}

async function getStream(): Promise<MediaStream> {
  const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(
    Owt.Base.AudioSourceInfo.MIC
  );
  const videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(
    Owt.Base.VideoSourceInfo.CAMERA
  );
  const resolution = getResolution();
  if (resolution) {
    videoConstraintsForCamera.resolution = new Owt.Base.Resolution(
      resolution.width,
      resolution.height
    );
  }
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

let RESOLUTION_RETRY = 0;
const resolutions = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 }
];
function getResolution() {
  console.log("RESOLUTION_RETRY:", RESOLUTION_RETRY);
  if (RESOLUTION_RETRY >= resolutions.length) return false;
  return resolutions[RESOLUTION_RETRY++];
}

export default Room;
