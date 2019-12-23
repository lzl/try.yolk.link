import React, { useRef, useEffect, useState } from 'react'

// thx https://github.com/otalk/hark/issues/38
let audioContext

function Canvas({ localStream }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let meter
    let requestID

    async function process() {
      const canvasContext = canvasRef.current.getContext('2d')
      window.AudioContext = window.AudioContext || window.webkitAudioContext
      audioContext = audioContext || new AudioContext()
      // const audioStream = await navigator.mediaDevices.getUserMedia({
      //   audio: true,
      // })
      const mediaStreamSource = audioContext.createMediaStreamSource(
        localStream
      )
      meter = createAudioMeter(audioContext)
      mediaStreamSource.connect(meter)
      drawLoop()

      function drawLoop() {
        const width = canvasContext.canvas.width
        const height = canvasContext.canvas.height
        canvasContext.clearRect(0, 0, width, height)
        if (meter.checkClipping()) {
          canvasContext.fillStyle = '#ed64a6'
        } else {
          canvasContext.fillStyle = '#48bb78'
        }
        canvasContext.fillRect(0, 0, meter.volume * width * 1.4, height)

        requestID = window.requestAnimationFrame(drawLoop)
      }
    }

    process()

    return () => {
      window.cancelAnimationFrame(requestID)
      if (meter) meter.shutdown()
    }
  }, [localStream])

  return <canvas ref={canvasRef} width="300" height="10"></canvas>
}

function Svg({ localStream }) {
  const [height, setHeight] = useState(0)
  const [fill, setFill] = useState('')

  useEffect(() => {
    let meter
    let requestID

    async function process() {
      window.AudioContext = window.AudioContext || window.webkitAudioContext
      audioContext = audioContext || new AudioContext()
      const mediaStreamSource = audioContext.createMediaStreamSource(
        localStream
      )
      meter = createAudioMeter(audioContext)
      mediaStreamSource.connect(meter)
      drawLoop()

      function drawLoop() {
        if (meter.checkClipping()) {
          setFill('#ed64a6')
        } else {
          setFill('#48bb78')
        }

        setHeight(() => {
          const height = meter.volume * 40
          if (height > 13) return 13
          return height
        })

        requestID = window.requestAnimationFrame(drawLoop)
      }
    }

    process()

    return () => {
      window.cancelAnimationFrame(requestID)
      if (meter) meter.shutdown()
    }
  }, [localStream])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
      <g transform="scale(1,-1) translate(9.5,-14.6)">
        <rect
          x="0"
          y="0"
          width="5"
          height={height}
          rx="3"
          fill={fill}
          strokeWidth="0"
        />
      </g>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    </svg>
  )
}

function createAudioMeter(audioContext, clipLevel, averaging, clipLag) {
  const processor = audioContext.createScriptProcessor(512)
  processor.onaudioprocess = volumeAudioProcess
  processor.clipping = false
  processor.lastClip = 0
  processor.volume = 0
  processor.clipLevel = clipLevel || 0.98
  processor.averaging = averaging || 0.95
  processor.clipLag = clipLag || 750

  processor.connect(audioContext.destination)

  processor.checkClipping = function() {
    if (!this.clipping) return false
    if (this.lastClip + this.clipLag < window.performance.now())
      this.clipping = false
    return this.clipping
  }

  processor.shutdown = function() {
    this.disconnect()
    this.onaudioprocess = null
  }

  return processor
}

function volumeAudioProcess(event) {
  const buf = event.inputBuffer.getChannelData(0)
  let sum = 0
  let x

  for (var i = 0; i < buf.length; i++) {
    x = buf[i]
    if (Math.abs(x) >= this.clipLevel) {
      this.clipping = true
      this.lastClip = window.performance.now()
    }
    sum += x * x
  }

  const rms = Math.sqrt(sum / buf.length)
  this.volume = Math.max(rms, this.volume * this.averaging)
}

export const VolumeMeterCanvas = React.memo(Canvas)
export const VolumeMeterSvg = React.memo(Svg)
