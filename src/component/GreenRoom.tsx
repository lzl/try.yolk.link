import React, { useState, useEffect, useCallback } from 'react'
import { Link } from '@reach/router'
import { Formik, Form, Field } from 'formik'
import * as Sentry from '@sentry/browser'
import { useStore } from '../store'
import Video from './Video'
import { VolumeMeterCanvas } from './VolumeMeter'
import Button from './Button'
import CopyUrl from './CopyUrl'
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
        Sentry.captureException(err)
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
        const ownedRoomId = localStorage.getItem('roomId')
        if (ownedRoomId === roomId) {
          localStorage.removeItem('roomId')
        }

        let recentRooms = JSON.parse(
          localStorage.getItem('recentRooms') || '[]'
        )
        if (recentRooms.length > 0) {
          recentRooms = recentRooms.filter((r: any) => r.roomId !== roomId)
          localStorage.setItem('recentRooms', JSON.stringify(recentRooms))
        }

        throw new Error(data.message)
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
      Sentry.captureException(err)
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
      // RESOLUTION_RETRY = 0
    }
  }, [])

  async function handleJoinRoom(token: string) {
    try {
      if (token) {
        const info = await conference.join(token)
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
        Sentry.captureException(err)
      }
    }
  }

  if (error) {
    return (
      <main className="m-4">
        <code>{error}</code>
        <p>
          Seems like there is something wrong happens here.{' '}
          <a href="/" className="font-bold text-yellow-500 underline">
            Go to homepage.
          </a>
        </p>
      </main>
    )
  }

  if (hasNotFoundError) {
    Sentry.captureMessage(
      'Seems like there is no Microphone or Camera at current device.'
    )
    return (
      <main className="m-4">
        <p>Seems like there is no Microphone or Camera at current device.</p>
        <p className="mt-2">
          You can resolve this issue by open current url with your mobile phone.
        </p>
      </main>
    )
  }

  if (hasNotAllowedError) {
    Sentry.captureMessage(
      'Seems like Microphone and Camera are blocked by the browser.'
    )
    return (
      <main className="m-4">
        <p>
          Seems like Microphone and Camera are <em>blocked</em> by the browser.
        </p>
        <p className="mt-2">
          You can resolve this issue with the help of{' '}
          <a
            className="font-bold text-yellow-500 underline"
            href="https://www.howtogeek.com/411117/how-to-change-a-sites-camera-and-microphone-permissions-in-chrome/"
            target="_blank"
            rel="noopener noreferrer"
          >
            this How-To article.
          </a>
        </p>
      </main>
    )
  }

  if (hasPermission) {
    return (
      <main>
        <div className="sm:mt-8">
          <div className="flex justify-between max-w-3xl mx-auto bg-white">
            <Link to="/" className="flex items-center px-4 py-4">
              <h1 className="font-bold text-gray-700 ">Yolk Link</h1>
            </Link>
            <div className="flex flex-1 px-4 py-4">
              <CopyUrl right />
            </div>
          </div>
        </div>
        {localStream && (
          <div className="max-w-3xl mx-auto">
            <Video stream={localStream} muted={true} />
            <VolumeMeterCanvas localStream={localStream} />
          </div>
        )}
        <div className="flex flex-col justify-between max-w-3xl px-4 py-4 mx-auto bg-white sm:flex-row">
          {userName ? (
            <div>
              <span className="text-gray-700">{userName}</span>
              <Button
                className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
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
                if (values.userName.length === 0 || !values.userName.trim()) {
                  values.userName = ''
                  setSubmitting(false)
                  return
                }
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
                    className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
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
            className="px-2 py-2 mt-4 font-bold text-white bg-yellow-500 sm:mt-0 sm:py-1 hover:bg-yellow-600"
            onClick={() => handleJoinRoom(token)}
            disabled={!token || !userName}
            loading={isLoadingToken}
          >
            Join Meeting
          </Button>
        </div>
      </main>
    )
  }

  return (
    <section className="max-w-lg mx-auto bg-white sm:mt-8">
      <h2 className="px-4 pt-4 font-bold">Next Step</h2>
      <p className="px-4 pb-4 mt-1 text-xs leading-tight text-gray-500">
        For security reasons, this video meeting needs your permission.
      </p>
      <Button
        className="w-full h-12 font-bold text-white bg-yellow-500 hover:bg-yellow-600"
        onClick={handleGetStream}
        disabled={isLoadingLocalStream}
        loading={isLoadingLocalStream}
      >
        Allow to use Microphone and Camera
      </Button>
    </section>
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
  // const resolution = getResolution()
  // if (resolution) {
  //   videoConstraintsForCamera.resolution = new Owt.Base.Resolution(
  //     resolution.width,
  //     resolution.height
  //   )
  // }
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

// let RESOLUTION_RETRY = 0
// const resolutions = [
//   { width: 1920, height: 1080 },
//   { width: 1280, height: 720 },
// ]
// function getResolution() {
//   console.log('RESOLUTION_RETRY:', RESOLUTION_RETRY)
//   if (RESOLUTION_RETRY >= resolutions.length) return false
//   return resolutions[RESOLUTION_RETRY++]
// }

export default GreenRoom
