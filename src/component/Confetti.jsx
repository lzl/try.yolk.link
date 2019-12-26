import React, { useEffect, useRef } from 'react'
import { confetti } from 'dom-confetti'

const config = {
  colors: ['#f56565', '#ecc94b', '#48bb78', '#4299e1', '#9f7aea'],
}

export default ({ active }) => {
  const refEl = useRef(null)

  useEffect(() => {
    if (active) confetti(refEl.current, config)
  }, [active])

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
      }}
      ref={refEl}
    />
  )
}
