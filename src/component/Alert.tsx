import React from 'react'

interface Props {
  title: string | JSX.Element
  content?: string | JSX.Element
  children?: string | JSX.Element
}

const Alert = ({ title, content, children }: Props) => (
  <section className="max-w-lg mx-auto bg-white sm:mt-8">
    <h2 className="px-4 pt-4 font-bold">{title}</h2>
    {content && (
      <p className="px-4 pb-4 mt-1 text-xs leading-tight text-gray-500">
        {content}
      </p>
    )}
    {children}
  </section>
)

export default Alert
