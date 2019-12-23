import React from 'react'
import Loader from './Loader'

const Button = (props: any) => {
  return (
    <button
      className={props.className}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
      {props.loading && (
        <span style={{ marginLeft: '5px' }}>
          <Loader />
        </span>
      )}
    </button>
  )
}

export default Button
