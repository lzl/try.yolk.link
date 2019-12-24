import React from 'react'
import classNames from 'classnames'

const Button = (props: any) => {
  return (
    <button
      className={classNames(props.className, {
        'opacity-50 cursor-not-allowed': props.disabled,
        rolling: props.loading,
      })}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  )
}

export default Button
