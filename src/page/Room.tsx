import React, { useEffect } from 'react'
import { navigate, RouteComponentProps } from '@reach/router'
import { useMachine } from '@xstate/react'
import { Formik, Form, Field } from 'formik'
import { Link } from '@reach/router'
import roomMachine, { conference } from '../machine/room'
import Video from '../component/Video'
import { VolumeMeterCanvas } from '../component/VolumeMeter'
import Button from '../component/Button'
import CopyUrl from '../component/CopyUrl'
import Alert from '../component/Alert'
import { useLogRoomDuration, useLogRoomInterval } from '../hook/useLog'

interface Props
  extends RouteComponentProps<{
    roomId: string
  }> {}

const Room = (props: Props) => {
  const { roomId } = props
  const [current, send] = useMachine(roomMachine, {
    devTools: process.env.NODE_ENV === 'development',
    context: { roomId },
  })
  const {
    errorName,
    errorMessage,
    localStream,
    userName,
    conferenceInfo,
    mixedMediaStream,
    remoteStreams,
    mixedRemoteStream,
    activeStreamId,
    activeStreamNumber,
  } = current.context

  useLogRoomDuration({ roomId })
  useLogRoomInterval({ roomId })

  useEffect(() => {
    const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]')
    const currentRoom = recentRooms.find((r: any) => r.roomId === roomId)
    const otherRooms = recentRooms.filter((r: any) => r.roomId !== roomId)
    const newRecentRooms = currentRoom
      ? [currentRoom, ...otherRooms]
      : [{ roomId }, ...otherRooms]
    localStorage.setItem('recentRooms', JSON.stringify(newRecentRooms))
  }, [roomId])

  useEffect(() => {
    return function cleanup() {
      if (conferenceInfo && conference) {
        conference.leave()
      }
    }
  }, [conferenceInfo])

  useEffect(() => {
    // via https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onunload
    function handleUnload() {
      if (conferenceInfo && conference) {
        conference.leave()
      }
    }
    window.addEventListener('unload', handleUnload)

    return function cleanup() {
      window.removeEventListener('unload', handleUnload)
    }
  }, [conferenceInfo])

  useEffect(() => {
    return function cleanup() {
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop())
      }
    }
  }, [localStream])

  useEffect(() => {
    conference.addEventListener('streamadded', ({ stream }: any) => {
      // console.log('streamadded:', stream)
      send({ type: 'ADD_REMOTE_STREAM', stream })
    })

    return function cleanup() {
      conference.clearEventListener('streamadded')
    }
  }, [send])

  useEffect(() => {
    remoteStreams.forEach((stream: any) => {
      stream.addEventListener('ended', () => {
        // console.log('streamended:', stream)
        send({ type: 'REMOVE_REMOTE_STREAM', stream })
      })
    })

    return function cleanup() {
      remoteStreams.forEach((stream: any) => {
        stream.clearEventListener('ended')
      })
    }
  }, [remoteStreams, send])

  useEffect(() => {
    if (mixedRemoteStream) {
      mixedRemoteStream.addEventListener(
        'activeaudioinputchange',
        ({ activeAudioInputStreamId: activeStreamId }: any) => {
          send({ type: 'SET_ACTIVE_STREAM_ID', activeStreamId })
        }
      )
    }
  }, [mixedRemoteStream, send])

  useEffect(() => {
    if (activeStreamId) {
      const activeStreamNumber = computeActiveStreamNumber(
        activeStreamId,
        remoteStreams
      )
      send({ type: 'SET_ACTIVE_STREAM_NUMBER', activeStreamNumber })
    }
  }, [activeStreamId, remoteStreams, send])

  const showLocalStream =
    current.matches({ localStream: 'final' }) &&
    !current.matches({ auth: 'final' })
  const showMixedStream = current.matches({ auth: 'final' })
  const showMixedStreamLoading =
    current.matches({ auth: 'final' }) &&
    !current.matches({ live: { publishing: 'final' } })
  const showController = current.matches({ auth: 'final' })
  const showUserNameEditForm =
    current.matches({ device: 'final' }) && current.matches({ auth: 'editing' })
  const showJoinButton =
    current.matches({ auth: 'saved' }) ||
    current.matches({ auth: 'token' }) ||
    current.matches({ auth: 'joining' })
  const showJoinButtonLoading = !current.matches({ auth: 'token' })

  if (current.matches({ device: 'failed' })) {
    return (
      <Alert
        title="Microphone or Camera is not found"
        content="Seems like there is no Microphone or Camera at current device."
      />
    )
  }

  if (current.matches({ localStream: 'failed' })) {
    return (
      <Alert
        title={
          <>
            Microphone and Camera are <em>blocked</em> by the browser
          </>
        }
        content={
          <>
            <p className="mt-2">
              You can resolve this issue with the help of{' '}
              <a
                className="font-bold text-yellow-500 underline"
                href="https://www.howtogeek.com/411117/how-to-change-a-sites-camera-and-microphone-permissions-in-chrome/"
                target="_blank"
                rel="noopener noreferrer"
              >
                this How-To article
              </a>
            </p>
          </>
        }
      />
    )
  }

  if (current.matches({ device: 'manual' })) {
    return (
      <Alert
        title="Next Step"
        content="For security reasons, this video meeting needs your permission."
      >
        <Button
          className="w-full h-12 font-bold text-white bg-yellow-500 hover:bg-yellow-600"
          onClick={() => send({ type: 'GET_LOCALSTREAM' })}
          disabled={current.matches({ localStream: 'loading' })}
          loading={current.matches({ localStream: 'loading' })}
        >
          Allow to use Microphone and Camera
        </Button>
      </Alert>
    )
  }

  if (current.matches({ auth: 'failed' })) {
    if (errorName === 'SyntaxError') {
      if (errorMessage === 'Unexpected token < in JSON at position 0') {
        return (
          <Alert
            title="Error happens"
            content="Can not access to the API server."
          />
        )
      }
    }

    if (errorName === 'FetchError') {
      return (
        <Alert
          title="Error happens"
          content="Can not access to the RTC server."
        />
      )
    }

    if (errorName === 'NotFound') {
      if (errorMessage === 'instance not found') {
        return (
          <Alert
            title="This room does not exist"
            content="Seems like this url is uncorrect."
          />
        )
      }
    }

    if (errorName === 'Error') {
      if (errorMessage === 'Room is full') {
        return (
          <Alert
            title={
              <>
                This room is <em>full</em>
              </>
            }
            content="Please contact room owner to increase room quota."
          />
        )
      }
    }

    return <Alert title={errorName} content={errorMessage} />
  }

  return (
    <main className="container mx-auto">
      <div className="flex justify-between mb-px bg-white">
        <Link to="/" className="flex items-center flex-shrink-0 px-4 py-4">
          <h1 className="font-bold text-gray-700 ">Yolk Link</h1>
        </Link>
        <div className="flex flex-1 px-4 py-4">
          <CopyUrl right />
        </div>
      </div>

      {showUserNameEditForm && (
        <div className="flex flex-col justify-between px-4 py-4 bg-white sm:flex-row">
          <Formik
            initialValues={{ userName }}
            onSubmit={(values, { setSubmitting }) => {
              if (
                values.userName === null ||
                values.userName.length === 0 ||
                !values.userName.trim()
              ) {
                values.userName = ''
                return
              }
              send({ type: 'SAVE_USERNAME', userName: values.userName })
            }}
          >
            {({ isSubmitting, values }) => (
              <Form className="flex">
                <Field
                  className="text-gray-700 border-b border-b-2 appearance-none focus:outline-none"
                  type="text"
                  name="userName"
                  placeholder="Your Name"
                  value={values.userName}
                />
                <Button
                  // className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
                  className="px-2 py-1 ml-2 font-bold text-white bg-yellow-500 hover:bg-yellow-600"
                  type="submit"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                >
                  Submit
                </Button>
              </Form>
            )}
          </Formik>
        </div>
      )}

      {showJoinButton && (
        <div className="flex flex-col justify-between px-4 py-4 bg-white sm:flex-row">
          <div>
            <span className="text-gray-700">{userName}</span>
            <Button
              // className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
              className="px-2 py-1 ml-2 font-semibold text-gray-800 bg-white border border-gray-400 hover:bg-gray-100"
              onClick={() => send('EDIT_USERNAME')}
            >
              Change Name
            </Button>
          </div>

          <Button
            className="px-2 py-2 mt-4 font-bold text-white bg-yellow-500 sm:mt-0 sm:py-1 hover:bg-yellow-600"
            onClick={() => send('JOIN_ROOM')}
            disabled={showJoinButtonLoading}
            loading={showJoinButtonLoading}
          >
            Join Meeting
          </Button>
        </div>
      )}

      {showController && (
        <div className="flex justify-between px-4 py-4 bg-white">
          <Button
            // className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
            className="px-2 py-1 ml-2 font-semibold text-gray-800 bg-white border border-gray-400 hover:bg-gray-100"
            onClick={() => send('TOGGLE_AUDIO')}
            disabled={!current.matches({ live: { publishing: 'final' } })}
          >
            {current.matches({
              live: { publishing: { final: { audio: 'muted' } } },
            })
              ? 'Unmute Mic'
              : 'Mute Mic'}
          </Button>
          <Button
            className="px-2 py-1 ml-2 font-semibold text-red-500 bg-transparent border border-red-500 hover:bg-red-700 hover:border-transparent hover:text-white"
            onClick={() => navigate('/')}
          >
            Leave
          </Button>
        </div>
      )}

      {showLocalStream && (
        <>
          <VolumeMeterCanvas localStream={localStream} />
          <Video stream={localStream} muted={true} />
        </>
      )}

      {showMixedStream && (
        <>
          {current.matches({
            live: { publishing: { final: { audio: 'unmuted' } } },
          }) ? (
            <VolumeMeterCanvas localStream={localStream} />
          ) : (
            <div className="w-full h-2" />
          )}
          <div className="relative">
            <Video stream={mixedMediaStream} muted={false} />
            <RemoteMixedStreamGrid
              remoteStreamsLength={remoteStreams.length}
              activeStreamNumber={activeStreamNumber}
              remoteStreams={remoteStreams}
            />
            <div
              className="absolute top-0 left-0 w-full h-full rolling"
              style={{
                opacity: showMixedStreamLoading ? '0.7' : '0',
              }}
            ></div>
          </div>
        </>
      )}

      <footer className="my-4">
        <p className="text-center text-gray-500">
          This app is{' '}
          <a
            href="https://github.com/lzl/try.yolk.link"
            className="border-b hover:text-gray-700 hover:border-gray-700"
          >
            open source
          </a>
        </p>
      </footer>
    </main>
  )
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

  // console.log('current remote streams:', remoteStreams)

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
  let activeStreamNumber = 1
  for (let i = 0; i < remoteStreams.length; i++) {
    if (remoteStreams[i].id === activeStreamId) {
      activeStreamNumber = i + 1
    }
  }
  return activeStreamNumber
}

export default Room
