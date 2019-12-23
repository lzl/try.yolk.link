import { useEffect, useCallback } from 'react'

const isProduction = process.env.NODE_ENV === 'production'

function formatBody(body: any) {
  const userName = localStorage.getItem('userName')
  if (userName) {
    body = { ...body, userName }
  }

  const deviceId = localStorage.getItem('deviceId')
  if (deviceId) {
    body = { ...body, deviceId }
  }

  return JSON.stringify(body)
}

export function useLogRoomVisited({ roomId }: any) {
  useEffect(() => {
    if (!isProduction) return
    if (!navigator.sendBeacon) return

    const body = formatBody({
      type: 'room_visited',
      roomId,
    })
    navigator.sendBeacon('/api/log', body)
  }, [roomId])
}

export function useLogRoomJoined({ roomId }: any) {
  useEffect(() => {
    if (!isProduction) return
    if (!navigator.sendBeacon) return

    const body = formatBody({
      type: 'room_joined',
      roomId,
    })
    navigator.sendBeacon('/api/log', body)
  }, [roomId])
}

export function useLogRoomInterval({ roomId }: any) {
  useEffect(() => {
    if (!isProduction) return
    if (!navigator.sendBeacon) return

    const duration = 5 * 60 * 1000 // every 5 minites
    const id = setInterval(() => {
      const body = formatBody({
        type: 'room_interval',
        roomId,
        duration,
      })
      navigator.sendBeacon('/api/log', body)
    }, duration)

    return function cleanup() {
      if (!isProduction) return

      clearInterval(id)
    }
  }, [roomId])
}

export function useLogRoomDuration({ roomId }: any) {
  const send = useCallback(
    ({ startedAt, event }) => {
      if (!navigator.sendBeacon) return

      const endedAt = Date.now()
      const duration = endedAt - startedAt
      const body = formatBody({
        type: 'room_duration',
        roomId,
        startedAt,
        endedAt,
        duration,
        event,
      })
      navigator.sendBeacon('/api/log', body)
    },
    [roomId]
  )

  useEffect(() => {
    if (!isProduction) return

    const startedAt = Date.now()
    const event = 'unmount'

    return function cleanup() {
      if (!isProduction) return

      send({ startedAt, event })
    }
  }, [send])

  useEffect(() => {
    if (!isProduction) return

    const startedAt = Date.now()
    const event = 'unload'

    function handleUnload() {
      send({ startedAt, event })
    }
    window.addEventListener('unload', handleUnload)

    return function cleanup() {
      if (!isProduction) return

      window.removeEventListener('unload', handleUnload)
    }
  }, [send])
}
