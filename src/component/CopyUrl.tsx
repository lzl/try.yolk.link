import React, { useState } from 'react'
import copy from 'clipboard-copy'
import Button from './Button'
import { Link } from '@reach/router'

const CopyUrl = () => {
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex justify-between max-w-3xl mx-auto bg-white">
      <Link to="/" className="flex items-center px-4 py-4">
        <h1 className="font-bold text-gray-700 ">Yolk Link</h1>
      </Link>
      <div className="flex justify-end flex-1 px-4 py-4">
        <input
          id="url"
          type="url"
          value={window.location.href}
          readOnly
          className="w-full text-xs text-right text-gray-500"
          onFocus={e => {
            e.target.select()
            e.target.setSelectionRange(0, e.target.value.length)
          }}
        />
        <Button
          className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-500 hover:text-white hover:border-transparent"
          disabled={copied}
          onClick={() => {
            copy(window.location.href)
            setCopied(true)
            setTimeout(() => setCopied(false), 10000)
          }}
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}

export default CopyUrl
