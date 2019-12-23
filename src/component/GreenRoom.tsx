import React, { useState, useEffect, useCallback } from 'react'
import { Formik, Form, Field } from 'formik'
import { useStore } from '../store'
import Video from './Video'
import { VolumeMeterCanvas } from './VolumeMeter'
import Button from './Button'
import { useLogRoomVisited } from '../hook/useLog'

declare const Owt: any

let RENDER_COUNTER = 1
const DEFAULT_ROOM_ID = '251260606233969163'

const GreenRoom = (props: any) => {
  console.log('GreenRoom RENDER_COUNTER:', RENDER_COUNTER++)
  const { conference, roomId = DEFAULT_ROOM_ID, setIsJoined } = props

  const [token, setToken] = useState('')
  const [isLoadingToken, setLoadingToken] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [isLoadingLocalStream, setIsLoadingLocalStream] = useState(false)
  const [hasNotFoundError, setHasNotFoundError] = useState(false)
  const [hasNotAllowedError, setHasNotAllowedError] = useState(false)
  const [error, setError] = useState('')

  const localStream: MediaStream = useStore(state => state.localStream)
  const setLocalStream = useStore(state => state.setLocalStream)
  const userName: string = useStore(state => state.userName)
  const setUserName = useStore(state => state.setUserName)
  const setConferenceInfo = useStore(state => state.setConferenceInfo)

  useLogRoomVisited({ roomId })

  const handleGetStream = useCallback(async () => {
    setIsLoadingLocalStream(true)

    try {
      const localStream = await getStream()
      setHasPermission(true)
      setLocalStream(localStream)
    } catch (err) {
      const { name, message } = err
      if (name === 'NotFoundError') {
        setHasNotFoundError(true)
      } else if (name === 'NotAllowedError') {
        setHasNotAllowedError(true)
      } else if (
        name === 'OverconstrainedError' ||
        message === 'Invalid constraint'
      ) {
        handleGetStream()
      } else {
        setError(`${name}: ${message}`)
      }
    }

    setIsLoadingLocalStream(false)
  }, [setLocalStream])

  const handleCreateToken = useCallback(async () => {
    setLoadingToken(true)

    try {
      console.log('Join room:', roomId)
      console.time('token-create')
      const res = await fetch('/api/token-create', {
        method: 'POST',
        body: JSON.stringify({ roomId, userName }),
      })
      console.timeEnd('token-create')
      const data = await res.json()
      if (data.statusCode === 404) {
        if (data.message === 'NotFound') {
          throw new Error('roomId not found')
        }
      } else {
        const token: string = data.token
        console.log('Token:', token)
        setToken(token)
        setLoadingToken(false)
        return token
      }
    } catch (err) {
      const { name, message } = err
      setError(`${name}: ${message}`)
    }

    setLoadingToken(false)
  }, [roomId, userName])

  // check permission of devices
  useEffect(() => {
    checkPermission().then(result => {
      const { hasPermission, hasDeviceInput } = result
      if (!hasDeviceInput) setHasNotFoundError(true)
      setHasPermission(hasPermission)
      if (hasPermission) handleGetStream()
    })
  }, [handleGetStream])

  // get username
  useEffect(() => {
    const userName = localStorage.getItem('userName')
    if (userName) setUserName(userName)
  }, [setUserName])

  // get token if there is room id and has permission of devices
  useEffect(() => {
    if (hasPermission && userName) {
      handleCreateToken()
    }
  }, [hasPermission, userName, handleCreateToken])

  // get resolution of local stream
  useEffect(() => {
    if (!localStream || !localStream.getVideoTracks) return
    console.log('localStream:', localStream)
    const trackers = localStream.getVideoTracks()
    trackers.forEach(t => {
      const constraints = t.getConstraints()
      console.log('localstream resolution:', constraints)
    })
  }, [localStream])

  useEffect(() => {
    return function cleanup() {
      RENDER_COUNTER = 0
      RESOLUTION_RETRY = 0
    }
  }, [])

  async function handleJoinRoom(token: string) {
    try {
      if (token) {
        const info = await conference.join(token)
        console.log('1:', info)
        setConferenceInfo(info)
        setIsJoined(true)
      }
    } catch (err) {
      const { name, message } = err
      setToken('')
      if (message === 'Expired') {
        const token = await handleCreateToken()
        if (token) handleJoinRoom(token)
      } else {
        setError(`${name}: ${message}`)
      }
    }
  }

  if (error) {
    return <div>{error}</div>
  }

  if (hasNotFoundError) {
    return <div>NotFoundError</div>
  }

  if (hasNotAllowedError) {
    return <div>NotAllowedError</div>
  }

  if (hasPermission) {
    return (
      <main>
        {localStream && (
          <div className="max-w-3xl mx-auto sm:mt-8">
            <Video stream={localStream} muted={true} />
            <VolumeMeterCanvas localStream={localStream} />
          </div>
        )}
        <div className="flex justify-between max-w-lg px-4 py-4 mx-auto bg-white">
          {userName ? (
            <div>
              <span className="text-gray-700">{userName}</span>
              <Button
                className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-transparent"
                onClick={() => {
                  setUserName('')
                  setToken('')
                }}
              >
                Change Name
              </Button>
            </div>
          ) : (
            <Formik
              initialValues={{ userName: '' }}
              onSubmit={(values, { setSubmitting }) => {
                localStorage.setItem('userName', values.userName)
                setUserName(values.userName)
              }}
            >
              {({ isSubmitting }) => (
                <Form>
                  <Field
                    className="h-full text-gray-700 border-b border-b-2 appearance-none focus:outline-none"
                    type="text"
                    name="userName"
                    placeholder="Your Name"
                  />
                  <Button
                    className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-transparent"
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
            className="flex items-center px-2 py-1 font-bold text-white bg-yellow-500 hover:bg-yellow-700"
            onClick={() => handleJoinRoom(token)}
            disabled={!token || !userName}
            loading={isLoadingToken}
          >
            Join Room
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="flex max-w-lg mx-auto bg-white sm:mt-8">
      <Button
        className="w-full h-16 text-xl font-bold text-white bg-yellow-500 hover:bg-yellow-700"
        onClick={handleGetStream}
        disabled={isLoadingLocalStream}
        loading={isLoadingLocalStream}
      >
        Allow to use Microphone and Camera
      </Button>
    </main>
  )
}

async function checkPermission(): Promise<{
  hasPermission: boolean
  hasDeviceInput: boolean
}> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.')
    return {
      hasPermission: false,
      hasDeviceInput: false,
    }
  }

  const devices = await navigator.mediaDevices.enumerateDevices()

  const hasPermission = devices.some(device => device.label !== '')
  const hasAudioInput = devices.some(device => device.kind === 'audioinput')
  const hasVideoInput = devices.some(device => device.kind === 'videoinput')

  console.log('devices:', devices)
  console.log('hasPermission:', hasPermission)
  console.log('hasAudioInput:', hasAudioInput)
  console.log('hasVideoInput:', hasVideoInput)

  return {
    hasPermission,
    hasDeviceInput: hasAudioInput && hasVideoInput,
  }
}

async function getStream(): Promise<MediaStream> {
  const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(
    Owt.Base.AudioSourceInfo.MIC
  )
  const videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(
    Owt.Base.VideoSourceInfo.CAMERA
  )
  const resolution = getResolution()
  if (resolution) {
    videoConstraintsForCamera.resolution = new Owt.Base.Resolution(
      resolution.width,
      resolution.height
    )
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
  )
}

let RESOLUTION_RETRY = 0
const resolutions = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
]
function getResolution() {
  console.log('RESOLUTION_RETRY:', RESOLUTION_RETRY)
  if (RESOLUTION_RETRY >= resolutions.length) return false
  return resolutions[RESOLUTION_RETRY++]
}

export default GreenRoom
