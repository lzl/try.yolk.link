import React, { useState } from 'react'
import copy from 'clipboard-copy'
import Button from './Button'

const CopyUrl = () => {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex justify-between max-w-3xl px-4 py-4 mx-auto bg-white">
      <div className="flex-1">
        <input
          type="url"
          value={window.location.href}
          readOnly
          className="w-full h-full text-sm text-gray-700"
          onFocus={e => {
            e.target.select()
            e.target.setSelectionRange(0, e.target.value.length)
          }}
        />
      </div>
      <div className="ml-1">
        <Button
          className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-transparent"
          disabled={copied}
          onClick={() => {
            copy(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 10000)
          }}
        >
          {copied ? 'Copied!' : 'Copy to invite'}
        </Button>
      </div>
    </div>
  )
}

export default CopyUrl
