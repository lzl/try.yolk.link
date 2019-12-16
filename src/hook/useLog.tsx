import { useEffect, useCallback } from "react";

interface IUseLogRoomDuration {
  roomId: string;
}

export function useLogRoomDuration({ roomId }: IUseLogRoomDuration) {
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
      if (!navigator.sendBeacon) return;
      send({ startedAt, event });
    };
  }, [send]);

  useEffect(() => {
    const startedAt = Date.now();
    const event = "unload";

    function handleUnload() {
      if (!navigator.sendBeacon) return;
      send({ startedAt, event });
    }
    window.addEventListener("unload", handleUnload);

    return function cleanup() {
      window.removeEventListener("unload", handleUnload);
    };
  }, [send]);
}
