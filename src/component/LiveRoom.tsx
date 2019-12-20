import React, { useState, useEffect, useCallback } from "react";
import { navigate } from "@reach/router";
import { useStore } from "../store";
import Video from "./Video";
import { VolumeMeterCanvas } from "./VolumeMeter";
import Button from "./Button";
import {
  useLogRoomJoined,
  useLogRoomDuration,
  useLogRoomInterval
} from "../hook/useLog";

declare const Owt: any;

let RENDER_COUNTER = 1;
const DEFAULT_ROOM_ID = "251260606233969163";

const LiveRoom = (props: any) => {
  console.log("LiveRoom RENDER_COUNTER:", RENDER_COUNTER++);
  const { conference, roomId = DEFAULT_ROOM_ID } = props;

  const [error, setError] = useState("");
  const [mixedMediaStream, setMixedMediaStream] = useState();
  const [publishedStream, setPublishedStream] = useState();
  const [isMicMuted, setMicMuted] = useState(false);

  const conferenceInfo = useStore(state => state.conferenceInfo);
  const localStream: MediaStream = useStore(state => state.localStream);

  useLogRoomJoined({ roomId });
  useLogRoomDuration({ roomId });
  useLogRoomInterval({ roomId });

  const handleSubscribeStream = useCallback(
    async (stream: any) => {
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
      } catch (err) {
        console.log("handleSubscribe error:", err);
        const { name, message } = err;
        setError(`${name}: ${message}`);
      }
    },
    [conference]
  );

  const handleToggleAudio = useCallback(async () => {
    if (publishedStream) {
      isMicMuted
        ? await publishedStream.unmute("audio")
        : await publishedStream.mute("audio");
      setMicMuted(!isMicMuted);
    }
  }, [publishedStream, isMicMuted]);

  useEffect(() => {
    console.log("LiveRoom START");

    async function start() {
      try {
        console.log("Conference info:", conferenceInfo);
        // sub remote mix stream
        const streams = conferenceInfo.remoteStreams;
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
        setPublishedStream(stream);

        // mix stream
        await handleMixStreamToRoom(roomId, stream.id);
      } catch (err) {
        const { name, message } = err;
        setError(`${name}: ${message}`);
      }
    }

    start();
  }, [conference, conferenceInfo, handleSubscribeStream, localStream, roomId]);

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

  useEffect(() => {
    return function cleanup() {
      RENDER_COUNTER = 0;
    };
  }, []);

  if (error) {
    return <div>{error}</div>;
  }

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
};

export default LiveRoom;
