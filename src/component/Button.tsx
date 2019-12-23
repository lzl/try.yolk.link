import React from 'react'
import classNames from 'classnames'
import Loader from './Loader'

const Button = (props: any) => {
  return (
    <button
      className={classNames(props.className, {
        'opacity-50 cursor-not-allowed': props.disabled,
      })}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
      {props.loading && (
        <div className="ml-1">
          <Loader />
        </div>
      )}
    </button>
  )
}

export default Button
