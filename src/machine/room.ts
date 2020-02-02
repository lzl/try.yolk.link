import { Machine, assign } from 'xstate'

declare const Owt: any
export const conference = new Owt.Conference.ConferenceClient()

async function checkDeviceInput() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log('enumerateDevices() not supported.')
    return false
  }

  const devices = await navigator.mediaDevices.enumerateDevices()
  const hasAudioInput = devices.some(device => device.kind === 'audioinput')
  const hasVideoInput = devices.some(device => device.kind === 'videoinput')

  // console.log('=== checkDeviceInput ===')
  // console.log('devices:', devices)
  // console.log('hasAudioInput:', hasAudioInput)
  // console.log('hasVideoInput:', hasVideoInput)

  return hasAudioInput && hasVideoInput
}

const checkDevicePermission = () =>
  new Promise(async (resolve, reject) => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const hasPermission = devices.some(device => device.label !== '')

    // console.log('=== checkDevicePermission ===')
    // console.log('hasPermission:', hasPermission)

    if (hasPermission) {
      resolve(true)
    } else {
      reject('has no permission')
    }
  })

let RESOLUTION_RETRY = 0
const resolutions = [
  { width: 1920, height: 1080 },
  { width: 1280, height: 720 },
]
function getResolution() {
  // console.log('RESOLUTION_RETRY:', RESOLUTION_RETRY)
  if (RESOLUTION_RETRY >= resolutions.length) return false
  return resolutions[RESOLUTION_RETRY++]
}

async function getLocalStream() {
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

  return await Owt.Base.MediaStreamFactory.createMediaStream(
    new Owt.Base.StreamConstraints(
      audioConstraintsForMic,
      videoConstraintsForCamera
    )
  )
}

const getToken = (roomId = '254955509683061259', userName: string) =>
  new Promise(async (resolve, reject) => {
    const res = await fetch('/api/token-create', {
      method: 'POST',
      body: JSON.stringify({
        roomId,
        userName,
      }),
    })
    const data = await res.json()
    if (data.statusCode === 404) {
      const ownedRoomId = localStorage.getItem('roomId')
      if (ownedRoomId === roomId) {
        localStorage.removeItem('roomId')
      }

      let recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]')
      if (recentRooms.length > 0) {
        recentRooms = recentRooms.filter((r: any) => r.roomId !== roomId)
        localStorage.setItem('recentRooms', JSON.stringify(recentRooms))
      }

      reject(data)
    } else {
      resolve(data)
    }
  })

async function joinRoom(token: string) {
  return await conference.join(token)
}

const subMixStream = (remoteStreams: any) =>
  new Promise(async (resolve, reject) => {
    try {
      let mixedStream
      for (const stream of remoteStreams) {
        if (
          stream.id.includes('common') &&
          (stream.source.audio === 'mixed' || stream.source.video === 'mixed')
        ) {
          mixedStream = stream
        }
      }

      const subscription = await conference.subscribe(mixedStream, {
        audio: { codecs: [{ name: 'opus' }] },
        video: { codecs: [{ name: 'h264' }] },
      })
      // console.log('Subscription info:', subscription)
      subscription.addEventListener('error', (err: any) => {
        console.log('Subscription error: ' + err.error.message)
        reject(err.error)
      })

      resolve(mixedStream)
    } catch (err) {
      reject(err)
    }
  })

const pubLocalStream = (localStream: MediaStream, userName: string) =>
  new Promise(async (resolve, reject) => {
    try {
      const toPubLocalStream = new Owt.Base.LocalStream(
        localStream,
        new Owt.Base.StreamSourceInfo('mic', 'camera'),
        { userName }
      )
      const pubedLocalStream = await conference.publish(toPubLocalStream, {
        audio: [{ codec: { name: 'opus' }, maxBitrate: 300 }],
        video: [{ codec: { name: 'h264' }, maxBitrate: 2048 }],
      })
      pubedLocalStream.addEventListener('error', (err: any) => {
        console.log('Publication error: ' + err.error.message)
        reject(err.error)
      })
      resolve(pubedLocalStream)
    } catch (err) {
      reject(err)
    }
  })

async function mixPubedLocalStream(roomId: string, streamId: string) {
  await fetch('/api/stream-mix', {
    method: 'POST',
    body: JSON.stringify({ roomId, streamId }),
  })
}

interface RoomContext {
  errorName: any
  errorMessage: any
  localStream: MediaStream | null
  roomId?: string | null
  userName: string | null
  token: string | null
  conferenceInfo: any
  mixedMediaStream: any
  pubedLocalStream: any
  remoteStreams: any
  mixedRemoteStream: any
  activeStreamId: string | null
  activeStreamNumber: number | null
}

interface RoomStateSchema {
  states: {
    device: {
      states: {
        initializing: {}
        input: {}
        permission: {}
        manual: {
          states: {
            idle: {}
            loading: {}
            final: {}
          }
        }
        final: {}
        failed: {}
      }
    }
    localStream: {
      states: {
        initializing: {}
        loading: {}
        final: {}
        failed: {}
      }
    }
    auth: {
      states: {
        initializing: {}
        saved: {}
        editing: {}
        token: {}
        joining: {}
        final: {}
        failed: {}
      }
    }
    live: {
      states: {
        subscribing: {
          states: {
            initializing: {}
            pending: {}
            final: {}
            failed: {}
          }
        }
        publishing: {
          states: {
            initializing: {}
            pending: {}
            mixing: {}
            final: {
              states: {
                audio: {
                  states: {
                    muted: {}
                    unmuted: {}
                  }
                }
                video: {}
              }
            }
            failed: {}
          }
        }
      }
    }
  }
}

// type RoomEvent =
//   | { type: 'GET_LOCALSTREAM' }
//   | { type: 'EDIT_USERNAME' }
//   | { type: 'SAVE_USERNAME'; userName: string }
//   | { type: 'JOIN_ROOM' }

const roomMachine = Machine<RoomContext, RoomStateSchema, any>(
  {
    id: 'room',
    type: 'parallel',
    context: {
      errorName: null,
      errorMessage: null,
      localStream: null,
      roomId: localStorage.getItem('roomId'),
      userName: localStorage.getItem('userName'),
      token: null,
      conferenceInfo: null,
      mixedMediaStream: null,
      pubedLocalStream: null,
      remoteStreams: [],
      mixedRemoteStream: null,
      activeStreamId: null,
      activeStreamNumber: null,
    },
    states: {
      device: {
        initial: 'initializing',
        states: {
          initializing: {
            on: {
              '': {
                target: 'input',
              },
            },
          },
          input: {
            invoke: {
              id: 'checkDeviceInput',
              src: checkDeviceInput,
              onDone: {
                target: 'permission',
              },
              onError: {
                target: 'failed',
                actions: assign({
                  errorMessage: (context, event) => event.data,
                }),
              },
            },
          },
          permission: {
            invoke: {
              id: 'checkDevicePermission',
              src: checkDevicePermission,
              onDone: {
                target: 'final',
              },
              onError: {
                target: 'manual',
              },
            },
          },
          manual: {
            initial: 'idle',
            states: {
              idle: {
                on: {
                  GET_LOCALSTREAM: 'loading',
                },
              },
              loading: {
                on: {
                  '': {
                    target: 'final',
                    cond: (context, event, meta) =>
                      meta.state.matches({ localStream: 'final' }),
                  },
                },
              },
              final: { type: 'final' },
            },
            onDone: 'final',
          },
          final: { type: 'final' },
          failed: {},
        },
      },
      localStream: {
        initial: 'initializing',
        states: {
          initializing: {
            on: {
              '': {
                target: 'loading',
                cond: (context, event, meta) =>
                  meta.state.matches({ device: 'final' }) ||
                  meta.state.matches({ device: { manual: 'loading' } }),
              },
            },
          },
          loading: {
            invoke: {
              id: 'getLocalStream',
              src: getLocalStream,
              onDone: {
                target: 'final',
                actions: assign({
                  localStream: (context, event) => event.data,
                }),
              },
              onError: {
                target: 'failed',
                actions: assign({
                  errorName: (context, event) => event.data.name,
                  errorMessage: (context, event) => event.data.message,
                }),
              },
            },
          },
          final: { type: 'final' },
          failed: {
            on: {
              '': {
                target: 'loading',
                cond: context => context.errorName === 'OverconstrainedError',
              },
            },
          },
        },
      },
      auth: {
        initial: 'initializing',
        states: {
          initializing: {
            on: {
              '': [
                {
                  target: 'saved',
                  cond: 'hasUserName',
                },
                {
                  target: 'editing',
                },
              ],
            },
          },
          saved: {
            invoke: {
              id: 'getToken',
              src: (context: RoomContext) =>
                getToken(context.roomId!, context.userName!),
              onDone: {
                target: 'token',
                actions: assign({
                  token: (context, event) => event.data.token,
                }),
              },
              onError: {
                target: 'failed',
                actions: assign({
                  errorName: (context, event) => event.data.name,
                  errorMessage: (context, event) => event.data.message,
                }),
              },
            },
            on: {
              EDIT_USERNAME: 'editing',
            },
          },
          editing: {
            on: {
              SAVE_USERNAME: {
                target: 'saved',
                actions: ['setUserName', 'setUserNameToLocalStorage'],
              },
            },
          },
          token: {
            on: {
              JOIN_ROOM: {
                target: 'joining',
                cond: 'hasToken',
              },
              EDIT_USERNAME: 'editing',
            },
            after: {
              120000: 'saved', // refresh token every 2min
            },
          },
          joining: {
            invoke: {
              id: 'joinRoom',
              src: (context, event) => joinRoom(context.token),
              onDone: {
                target: 'final',
                actions: assign({
                  conferenceInfo: (context, event) => event.data,
                  activeStreamId: (context, event) => event.data.activeInput,
                  remoteStreams: (context, event) =>
                    event.data.remoteStreams.filter(
                      (s: any) => !s.id.includes('common')
                    ),
                }),
              },
              onError: {
                target: 'failed',
                actions: assign({
                  errorName: (context, event) => event.data.name,
                  errorMessage: (context, event) => event.data.message,
                }),
              },
            },
          },
          final: { type: 'final' },
          failed: {
            on: {
              '': {
                target: 'saved',
                cond: context => context.errorMessage === 'Expired',
              },
            },
          },
        },
      },
      live: {
        type: 'parallel',
        states: {
          subscribing: {
            initial: 'initializing',
            states: {
              initializing: {
                on: {
                  '': {
                    target: 'pending',
                    cond: (context, event, meta) =>
                      meta.state.matches({ auth: 'final' }),
                  },
                },
              },
              pending: {
                invoke: {
                  id: 'subMixStream',
                  src: (context, event) =>
                    subMixStream(context.conferenceInfo.remoteStreams),
                  onDone: {
                    target: 'final',
                    actions: assign({
                      mixedRemoteStream: (context, event) => event.data,
                      mixedMediaStream: (context, event) =>
                        event.data.mediaStream,
                    }),
                  },
                  onError: {
                    target: 'failed',
                    actions: assign({
                      errorName: (context, event) => {
                        console.log('subMixStream errorName:', event.data.name)
                        return event.data.name
                      },
                      errorMessage: (context, event) => {
                        console.log(
                          'subMixStream errorMessage:',
                          event.data.message
                        )
                        return event.data.message
                      },
                    }),
                  },
                },
              },
              final: { type: 'final' },
              failed: {},
            },
          },
          publishing: {
            initial: 'initializing',
            states: {
              initializing: {
                on: {
                  '': {
                    target: 'pending',
                    cond: (context, event, meta) =>
                      meta.state.matches({ auth: 'final' }),
                  },
                },
              },
              pending: {
                invoke: {
                  id: 'pubLocalStream',
                  src: (context, event) =>
                    pubLocalStream(context.localStream, context.userName),
                  onDone: {
                    target: 'mixing',
                    actions: assign({
                      pubedLocalStream: (context, event) => event.data,
                    }),
                  },
                  onError: {
                    target: 'failed',
                    actions: assign({
                      errorName: (context, event) => {
                        console.log(
                          'pubLocalStream errorName:',
                          event.data.name
                        )
                        return event.data.name
                      },
                      errorMessage: (context, event) => {
                        console.log(
                          'pubLocalStream errorMessage:',
                          event.data.message
                        )
                        return event.data.message
                      },
                    }),
                  },
                },
              },
              mixing: {
                invoke: {
                  id: 'mixPubedLocalStream',
                  src: (context, event) =>
                    mixPubedLocalStream(
                      context.roomId,
                      context.pubedLocalStream.id
                    ),
                  onDone: {
                    target: 'final',
                  },
                  onError: {
                    target: 'failed',
                    actions: assign({
                      errorName: (context, event) => {
                        console.log(
                          'mixPubedLocalStream errorName:',
                          event.data.name
                        )
                        return event.data.name
                      },
                      errorMessage: (context, event) => {
                        console.log(
                          'mixPubedLocalStream errorMessage:',
                          event.data.message
                        )
                        return event.data.message
                      },
                    }),
                  },
                },
              },
              final: {
                type: 'parallel',
                states: {
                  audio: {
                    initial: 'unmuted',
                    states: {
                      muted: {
                        on: {
                          TOGGLE_AUDIO: {
                            target: 'unmuted',
                            actions: 'unmuteAudio',
                          },
                        },
                      },
                      unmuted: {
                        on: {
                          TOGGLE_AUDIO: {
                            target: 'muted',
                            actions: 'muteAudio',
                          },
                        },
                      },
                    },
                  },
                  video: {},
                },
              },
              failed: {},
            },
          },
        },
      },
    },
    on: {
      ADD_REMOTE_STREAM: {
        actions: assign({
          remoteStreams: (context, event) => [
            ...context.remoteStreams.filter(
              (s: any) => s.id !== event.stream.id
            ),
            event.stream,
          ],
        }),
      },
      REMOVE_REMOTE_STREAM: {
        actions: assign({
          remoteStreams: (context, event) =>
            context.remoteStreams.filter(
              (s: any) => s.origin !== event.stream.origin
            ),
        }),
      },
      SET_ACTIVE_STREAM_ID: {
        actions: assign({
          activeStreamId: (context, event) => event.activeStreamId,
        }),
      },
      SET_ACTIVE_STREAM_NUMBER: {
        actions: assign({
          activeStreamNumber: (context, event) => event.activeStreamNumber,
        }),
      },
    },
  },
  {
    actions: {
      leaveConference: (context, event) => {
        if (conference) conference.leave()
      },
      setUserName: assign({
        userName: (context, event) => event.userName.trim(),
      }),
      setUserNameToLocalStorage: (context, event) =>
        localStorage.setItem('userName', event.userName.trim()),
      muteAudio: (context, event) => {
        context.pubedLocalStream.mute('audio')
      },
      unmuteAudio: (context, event) => {
        context.pubedLocalStream.unmute('audio')
      },
    },
    guards: {
      hasUserName: context => !!context.userName,
      hasToken: context => !!context.token,
    },
  }
)

export default roomMachine
