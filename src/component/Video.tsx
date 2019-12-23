import React, { useEffect } from 'react'

interface IVideo {
  stream: any
  muted: boolean
}

function Video({ stream, muted }: IVideo) {
  let videoElem: any

  useEffect(() => {
    if (videoElem) videoElem.srcObject = stream

    return function cleanup() {
      if (videoElem && videoElem.srcObject) {
        videoElem.srcObject = null
      }
    }
  }, [stream, videoElem])

  useEffect(() => {
    function handleUnload() {
      let stream = videoElem.srcObject
      let tracks = stream.getTracks()

      tracks.forEach(function(track: any) {
        track.stop()
      })
    }
    window.addEventListener('unload', handleUnload)

    return function cleanup() {
      window.removeEventListener('unload', handleUnload)
    }
  }, [videoElem])

  return (
    <video
      autoPlay
      muted={muted}
      playsInline
      ref={el => {
        videoElem = el
      }}
      style={{ display: 'block', width: '100%' }}
    >
      this browser does not supported video tag
    </video>
  )
}

export default React.memo(Video)
