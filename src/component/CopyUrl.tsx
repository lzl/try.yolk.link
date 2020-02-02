import React, { useState } from 'react'
import copy from 'clipboard-copy'
import cx from 'classnames'
import Button from './Button'

const CopyUrl = ({ right }: { right?: boolean }) => {
  const [copied, setCopied] = useState(false)

  return (
    <>
      <input
        id="url"
        type="url"
        value={window.location.href}
        readOnly
        className={cx('flex-1 text-sm leading-none text-gray-500', {
          'text-right': right,
        })}
        onFocus={e => {
          e.target.select()
          e.target.setSelectionRange(0, e.target.value.length)
        }}
      />
      <Button
        // className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
        className="px-2 py-1 ml-2 font-semibold text-gray-800 bg-white border border-gray-400 hover:bg-gray-100"
        disabled={copied}
        onClick={() => {
          copy(window.location.href)
          setCopied(true)
          setTimeout(() => setCopied(false), 10000)
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </>
  )
}

export default CopyUrl
