import React, { useState, useEffect, useCallback } from 'react'
import { navigate } from '@reach/router'
import { useStore } from '../store'
import Video from './Video'
import { VolumeMeterCanvas } from './VolumeMeter'
import Button from './Button'
import CopyUrl from './CopyUrl'
import {
  useLogRoomJoined,
  useLogRoomDuration,
  useLogRoomInterval,
} from '../hook/useLog'

declare const Owt: any

let RENDER_COUNTER = 1
const DEFAULT_ROOM_ID = '251260606233969163'

const LiveRoom = (props: any) => {
  console.log('LiveRoom RENDER_COUNTER:', RENDER_COUNTER++)
  const { conference, roomId = DEFAULT_ROOM_ID } = props

  const [error, setError] = useState('')
  const [mixedMediaStream, setMixedMediaStream] = useState()
  const [publishedStream, setPublishedStream] = useState()
  const [isMicMuted, setMicMuted] = useState(false)
  const [isStreamMixed, setIsStreamMixed] = useState(false)
  const [remoteStreams, setRemoteStreams] = useState<any[]>([])
  const [activeStreamId, setActiveStreamId] = useState('')
  const [activeStreamNumber, setActiveStreamNumber] = useState(0)
  const [, setParticipants] = useState()

  const conferenceInfo = useStore(state => state.conferenceInfo)
  const localStream: MediaStream = useStore(state => state.localStream)

  useLogRoomJoined({ roomId })
  useLogRoomDuration({ roomId })
  useLogRoomInterval({ roomId })

  const handleSubscribeStream = useCallback(
    async (stream: any) => {
      try {
        const subscription = await conference.subscribe(stream, {
          audio: { codecs: [{ name: 'opus' }] },
          video: { codecs: [{ name: 'h264' }] },
        })
        console.log('Subscription info:', subscription)
        subscription.addEventListener('error', (err: any) => {
          console.log('Subscription error: ' + err.error.message)
        })
        stream.addEventListener(
          'activeaudioinputchange',
          ({ activeAudioInputStreamId }: any) =>
            setActiveStreamId(activeAudioInputStreamId)
        )
        return stream.mediaStream
      } catch (err) {
        console.log('handleSubscribe error:', err)
        const { name, message } = err
        setError(`${name}: ${message}`)
      }
    },
    [conference]
  )

  const handleToggleAudio = useCallback(async () => {
    if (publishedStream) {
      setMicMuted((state: boolean) => {
        state ? publishedStream.unmute('audio') : publishedStream.mute('audio')
        return !state
      })
    }
  }, [publishedStream])

  useEffect(() => {
    console.log('LiveRoom START')

    async function start() {
      try {
        console.log('Conference info:', conferenceInfo)

        // participants
        const participants = conferenceInfo.participants
        console.log('old participants:', participants)
        setParticipants(participants)
        for (const participant of participants) {
          participant.addEventListener('left', () => {
            console.log('old participant left:', participant)
            setParticipants((ps: any) =>
              ps.filter((p: any) => p.id !== participant.id)
            )
          })
        }
        // sub remote mix stream
        const streams = conferenceInfo.remoteStreams
        let mixedStream
        for (const stream of streams) {
          if (
            stream.id.includes('common') &&
            (stream.source.audio === 'mixed' || stream.source.video === 'mixed')
          ) {
            mixedStream = stream
            console.log('MixedStream:', mixedStream)
          } else {
            stream.addEventListener('ended', () => {
              console.log('streamended:', stream)
              setRemoteStreams((rs: any) => {
                const remoteStreams = rs.filter(
                  (s: any) => s.origin !== stream.origin
                )
                return remoteStreams
              })
            })
            console.log('old remote stream:', stream)
            setRemoteStreams((rs: any) => {
              const remoteStreams = [
                ...rs.filter((s: any) => s.id !== stream.id),
                stream,
              ]
              return remoteStreams
            })
          }
        }
        const mixStream = await handleSubscribeStream(mixedStream)
        setMixedMediaStream(mixStream)

        // pub local stream
        const toPublishStream = new Owt.Base.LocalStream(
          localStream,
          new Owt.Base.StreamSourceInfo('mic', 'camera'),
          { userName: localStorage.getItem('userName') }
        )
        const stream = await conference.publish(toPublishStream, {
          audio: [{ codec: { name: 'opus' }, maxBitrate: 300 }],
          video: [{ codec: { name: 'h264' }, maxBitrate: 2048 }],
        })
        stream.addEventListener('error', (err: any) => {
          console.log('Publication error: ' + err.error.message)
        })
        console.log('published stream:', stream)
        setPublishedStream(stream)

        // mix stream
        await handleMixStreamToRoom(roomId, stream.id)
        setIsStreamMixed(true)

        if (conferenceInfo.activeInput) {
          setActiveStreamId(conferenceInfo.activeInput)
        }
      } catch (err) {
        const { name, message } = err
        setError(`${name}: ${message}`)
      }
    }

    start()
  }, [conference, conferenceInfo, handleSubscribeStream, localStream, roomId])

  async function handleMixStreamToRoom(roomId: string, streamId: string) {
    try {
      await fetch('/api/stream-mix', {
        method: 'POST',
        body: JSON.stringify({ roomId, streamId }),
      })
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    return function cleanup() {
      RENDER_COUNTER = 0
    }
  }, [])

  useEffect(() => {
    conference.addEventListener('streamadded', ({ stream }: any) => {
      console.log('streamadded:', stream)
      setRemoteStreams((rs: any) => {
        let remoteStreams = rs.filter((s: any) => s.id !== stream.id)
        remoteStreams = [...remoteStreams, stream]
        return remoteStreams
      })

      stream.addEventListener('ended', () => {
        console.log('streamended:', stream)
        setRemoteStreams((rs: any) => {
          const remoteStreams = rs.filter(
            (s: any) => s.origin !== stream.origin
          )
          return remoteStreams
        })
      })
    })

    conference.addEventListener('participantjoined', ({ participant }: any) => {
      console.log('new participant joined:', participant)
      setParticipants((ps: any) => [...ps, participant])

      participant.addEventListener('left', () => {
        console.log('new participant left:', participant)
        setParticipants((ps: any) =>
          ps.filter((p: any) => p.id !== participant.id)
        )
      })
    })

    return function cleanup() {
      conference.clearEventListener('streamadded')
      conference.clearEventListener('participantjoined')
    }
  }, [conference])

  useEffect(() => {
    const activeStreamNumber = computeActiveStreamNumber(
      activeStreamId,
      remoteStreams
    )
    setActiveStreamNumber(activeStreamNumber)
  }, [activeStreamId, remoteStreams])

  if (error) {
    return <div>{error}</div>
  }

  if (mixedMediaStream) {
    return (
      <main>
        <div className="sm:mt-8">
          <CopyUrl />
        </div>
        <div className="max-w-3xl mx-auto max-h-3/4">
          <div className="relative">
            <Video stream={mixedMediaStream} muted={false} />
            <RemoteMixedStreamGrid
              remoteStreamsLength={remoteStreams.length}
              activeStreamNumber={activeStreamNumber}
              remoteStreams={remoteStreams}
            />
            <div
              className="absolute top-0 left-0 w-full h-full rolling"
              style={{ opacity: isStreamMixed ? '0' : '0.7' }}
            ></div>
          </div>
          {isMicMuted ? (
            <div className="w-full h-2" />
          ) : (
            <VolumeMeterCanvas localStream={localStream} />
          )}
        </div>
        <div className="flex justify-between max-w-3xl px-4 py-4 mx-auto bg-white">
          <Button
            className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-transparent"
            onClick={handleToggleAudio}
          >
            {isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
          </Button>
          <Button
            className="px-2 py-1 ml-2 font-semibold text-red-500 bg-transparent border border-red-500 hover:bg-red-500 hover:border-transparent hover:text-white"
            onClick={() => navigate('/')}
          >
            Leave
          </Button>
        </div>
      </main>
    )
  } else {
    return null
  }
}

function RemoteMixedStreamGrid({
  remoteStreamsLength,
  activeStreamNumber,
  remoteStreams,
}: any) {
  let rowNumber = 0
  let columnNumber = 0
  let active: any = []
  if (remoteStreamsLength === 0 || activeStreamNumber === 0) {
    return null
  } else if (remoteStreamsLength === 1 || remoteStreamsLength === 2) {
    rowNumber = 1
    columnNumber = remoteStreamsLength
    active = [1, activeStreamNumber]
  } else if (remoteStreamsLength === 3 || remoteStreamsLength === 4) {
    rowNumber = 2
    columnNumber = 2
    if (activeStreamNumber === 1 || activeStreamNumber === 2) {
      active = [1, activeStreamNumber]
    } else {
      active = [2, activeStreamNumber - 2]
    }
  } else {
    return null
  }
  const row = [...new Array(rowNumber)]
  const column = [...new Array(columnNumber)]

  console.log('current remote streams:', remoteStreams)

  return (
    <div className="absolute top-0 left-0 flex flex-col w-full h-full">
      {row.map((_, i) => (
        <div key={i} className="flex flex-1">
          {column.map((_, j) => {
            const isActive = i + 1 === active[0] && j + 1 === active[1]
            return (
              <div
                key={j}
                className={
                  isActive
                    ? 'flex-1 relative border-4 border-yellow-500'
                    : 'flex-1 relative border-4 border-transparent'
                }
              >
                <div className="absolute bottom-0 left-0 px-2 py-1 text-sm text-white bg-black opacity-50">
                  {remoteStreams[2 * i + j]?.attributes?.userName}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function computeActiveStreamNumber(activeStreamId: string, remoteStreams: any) {
  let activeStreamNumber = 0
  for (let i = 0; i < remoteStreams.length; i++) {
    if (remoteStreams[i].id === activeStreamId) {
      activeStreamNumber = i + 1
    }
  }
  return activeStreamNumber
}

export default LiveRoom
