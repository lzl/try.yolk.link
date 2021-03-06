import create from 'zustand'

export const [useStore] = create(set => ({
  // hasPermission: false,
  // setHasPermission: (hasPermission: boolean) => set({ hasPermission }),
  localStream: null,
  setLocalStream: (localStream: MediaStream) => set({ localStream }),
  // token: "",
  // setToken: (token: string) => set({ token }),
  userName: '',
  setUserName: (userName: string) => set({ userName }),
  // mixedMediaStream: null,
  // setMixedMediaStream: (mixedMediaStream: any) => set({ mixedMediaStream }),
  // isMicMuted: false,
  // setMicMuted: (isMicMuted: boolean) => set({ isMicMuted }),
  conferenceInfo: null,
  setConferenceInfo: (conferenceInfo: any) => set({ conferenceInfo }),
  // publishedStream: null,
  // setPublishedStream: (publishedStream: any) => set({ publishedStream })
}))
