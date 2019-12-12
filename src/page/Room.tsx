import React, { useState, useEffect, useCallback } from "react";
import { RouteComponentProps, navigate } from "@reach/router";
import Video from "../component/Video";
import Button from "../component/Button";
import { Formik, Form, Field } from "formik";
import { VolumeMeterCanvas } from "../component/VolumeMeter";

declare const Owt: any;
const conference = new Owt.Conference.ConferenceClient();

const DEFAULT_ROOM_ID = "251260606233969163";

let LOCAL_STREAM: any;
let PUBLISHED_STREAM: any;

interface Props
  extends RouteComponentProps<{
    roomId: string;
  }> {}

const Room = (props: Props) => {
  const { roomId = DEFAULT_ROOM_ID } = props;

  const [token, setToken] = useState("");
  const [isLoadingToken, setLoadingToken] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [mixedMediaStream, setMixedMediaStream] = useState("");
  const [localStream, setLocalStream] = useState("");
  const [isLoadingLocalStream, setIsLoadingLocalStream] = useState(false);
  const [userName, setUserName] = useState("");
  const [isMute, setMute] = useState(false);

  // check permission of devices
  useEffect(() => {
    checkPermission().then(r => {
      setHasPermission(r);
      if (r) handleGetStream();
    });
  }, []);

  // get username
  useEffect(() => {
    const userName = localStorage.getItem("userName");
    if (userName) setUserName(userName);
  }, []);

  // get token if there is room id and has permission of devices
  useEffect(() => {
    if (hasPermission && userName) {
      handleCreateToken();
    }

    async function handleCreateToken() {
      try {
        // const roomId = localStorage.getItem("roomId");
        setLoadingToken(true);
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
        setLoadingToken(false);
      } catch (err) {
        console.log(err);
      }
    }
  }, [hasPermission, roomId, userName]);

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
      if (LOCAL_STREAM) {
        LOCAL_STREAM.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, []);

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
      console.log(err.name); // Error
      console.log(err.message); // Expired || Unknown
    }
  }

  async function handleGetStream() {
    try {
      setIsLoadingLocalStream(true);
      LOCAL_STREAM = await getStream();
      console.log("LOCAL_STREAM:", LOCAL_STREAM);
      setHasPermission(true);
      setLocalStream(LOCAL_STREAM);
      setIsLoadingLocalStream(false);
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

  const handleToggleAudio = useCallback(async () => {
    isMute
      ? await PUBLISHED_STREAM.unmute("audio")
      : await PUBLISHED_STREAM.mute("audio");
    setMute(() => !isMute);
  }, [isMute]);

  if (isJoined) {
    if (mixedMediaStream) {
      return (
        <div>
          <div>
            <Video stream={mixedMediaStream} muted={false} />
            {!isMute && <VolumeMeterCanvas localStream={localStream} />}
          </div>
          <div>
            <Button onClick={handleToggleAudio}>
              {isMute ? "unmute" : "mute"}
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
          onClick={handleJoinRoom}
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

export default Room;
