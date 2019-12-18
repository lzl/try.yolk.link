import { useEffect, useCallback } from "react";

interface IRoomId {
  roomId: string;
}

export function useLogRoomJoined({ roomId }: IRoomId) {
  useEffect(() => {
    if (!navigator.sendBeacon) return;

    const body = JSON.stringify({
      type: "room_joined",
      roomId,
    });
    navigator.sendBeacon("/api/log", body);
  }, [roomId]);
}

export function useLogRoomDuration({ roomId }: IRoomId) {
  const send = useCallback(
    ({ startedAt, event }) => {
      if (!navigator.sendBeacon) return;

      const endedAt = Date.now();
      const duration = endedAt - startedAt;
      const body = JSON.stringify({
        type: "room_duration",
        roomId,
        startedAt,
        endedAt,
        duration,
        event
      });
      navigator.sendBeacon("/api/log", body);
    },
    [roomId]
  );

  useEffect(() => {
    const startedAt = Date.now();
    const event = "unmount";

    return function cleanup() {
      send({ startedAt, event });
    };
  }, [send]);

  useEffect(() => {
    const startedAt = Date.now();
    const event = "unload";

    function handleUnload() {
      send({ startedAt, event });
    }
    window.addEventListener("unload", handleUnload);

    return function cleanup() {
      window.removeEventListener("unload", handleUnload);
    };
  }, [send]);
}
