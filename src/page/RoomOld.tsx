import React, { useState, useEffect } from 'react'
import { RouteComponentProps } from '@reach/router'
import nanoid from 'nanoid'
import { useStore } from '../store'
import GreenRoom from '../component/GreenRoom'
import LiveRoom from '../component/LiveRoom'

let RENDER_COUNTER = 1

declare const Owt: any
const conference = new Owt.Conference.ConferenceClient()

const DEFAULT_ROOM_ID = '251260606233969163'

interface Props
  extends RouteComponentProps<{
    roomId: string
  }> {}

const Room = (props: Props) => {
  console.log('Room RENDER_COUNTER:', RENDER_COUNTER++)
  const { roomId = DEFAULT_ROOM_ID } = props

  const [isJoined, setIsJoined] = useState(false)

  const localStream: MediaStream = useStore(state => state.localStream)

  useEffect(() => {
    const deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      const deviceId = nanoid()
      localStorage.setItem('deviceId', deviceId)
    }
  }, [])

  useEffect(() => {
    return function cleanup() {
      if (isJoined) {
        if (conference) conference.leave()
      }
    }
  }, [isJoined])

  useEffect(() => {
    // via https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload
    function handleUnload() {
      if (isJoined) {
        if (conference) conference.leave()
      }
    }
    window.addEventListener('unload', handleUnload)

    return function cleanup() {
      window.removeEventListener('unload', handleUnload)
    }
  }, [isJoined])

  useEffect(() => {
    return function cleanup() {
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop())
      }
    }
  }, [localStream])

  useEffect(() => {
    return function cleanup() {
      RENDER_COUNTER = 0
    }
  }, [])

  useEffect(() => {
    const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]')
    const currentRoom = recentRooms.find((r: any) => r.roomId === roomId)
    const otherRooms = recentRooms.filter((r: any) => r.roomId !== roomId)
    const newRecentRooms = currentRoom
      ? [currentRoom, ...otherRooms]
      : [{ roomId }, ...otherRooms]
    localStorage.setItem('recentRooms', JSON.stringify(newRecentRooms))
  }, [roomId])

  return isJoined ? (
    <LiveRoom conference={conference} roomId={roomId} />
  ) : (
    <GreenRoom
      conference={conference}
      roomId={roomId}
      setIsJoined={setIsJoined}
    />
  )
}

export default Room
