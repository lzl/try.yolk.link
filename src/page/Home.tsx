import React, { useState, useEffect } from 'react'
import { Link, RouteComponentProps } from '@reach/router'
import nanoid from 'nanoid'
import Button from '../component/Button'
import Confetti from '../component/Confetti'

const Home = (props: RouteComponentProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [roomId, setRoomId] = useState('')
  const [recentRooms, setRecentRooms] = useState([])
  const [canConfetti, setCanConfetti] = useState(false)

  useEffect(() => {
    const roomId = localStorage.getItem('roomId')
    if (roomId) setRoomId(roomId)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      const deviceId = nanoid()
      localStorage.setItem('deviceId', deviceId)
    }
  }, [])

  useEffect(() => {
    const recentRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]')
    if (recentRooms.length > 0) setRecentRooms(recentRooms)
  }, [])

  async function handleCreateRoomId() {
    try {
      setIsLoading(true)
      console.time('room-create')
      const res = await fetch('/api/room-create')
      console.timeEnd('room-create')
      const data = await res.json()
      const roomId: string = data.roomId
      console.log('Got a roomId:', roomId)
      localStorage.setItem('roomId', roomId)
      setRoomId(roomId)
      setCanConfetti(true)
      setIsLoading(false)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      <header className="max-w-lg mx-auto text-center bg-white">
        <h1 className="pt-8 text-4xl font-bold leading-none text-gray-900 sm:mt-8">
          Give Yolk Link a try
        </h1>
        <h2 className="mt-4 text-xl leading-snug text-gray-700">
          <p>A link connects you with</p>
          <p>
            your <span>clients</span> <em>face-to-face</em>
          </p>
        </h2>
        <section className="flex items-center justify-center p-8">
          {roomId ? (
            <Link to={roomId}>
              <Button
                disabled={isLoading}
                loading={isLoading}
                className="relative px-4 py-2 font-bold text-white bg-yellow-500 hover:bg-yellow-600"
              >
                <Confetti active={canConfetti} />
                Go to your Yolk Link
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleCreateRoomId}
              disabled={isLoading}
              loading={isLoading}
              className="px-4 py-2 font-bold text-white bg-yellow-500 hover:bg-yellow-600"
            >
              Get Started
            </Button>
          )}
        </section>
      </header>
      {recentRooms.length > 0 && (
        <section className="max-w-lg mx-auto mt-4 bg-white">
          <h2 className="p-4 font-bold">Continue with</h2>
          <ul>
            {recentRooms.map(({ roomId, presenters = [] }: any) => (
              <li key={roomId} className="border-t border-gray-100">
                <Link
                  to={roomId}
                  className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-yellow-600 hover:text-white"
                >
                  {presenters.length !== 0 ? (
                    <div>{presenters.join(', ')}</div>
                  ) : (
                    <div>Just yourself</div>
                  )}
                  <div className="ml-2">{roomId}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="relative max-w-lg mx-auto mt-4 bg-white md:my-16">
        <h2 className="p-4 font-bold border-b border-gray-100">How it works</h2>
        <picture>
          {/* <source srcSet="/assets/hero-small.jpg" media="(max-width: 600px)" /> */}
          {/* <source srcSet="/assets/hero.jpg" media="(min-width: 601px)" /> */}
          <img src="/assets/hero.jpg" alt="screenshot" />
        </picture>
        <div
          className="hidden md:block"
          style={{
            position: 'absolute',
            top: '-2em',
            right: '-10em',
            bottom: '-2em',
            left: '-10em',
            zIndex: 1,
            background:
              'url(/assets/hero-captions.png) center top/contain no-repeat',
          }}
        />
        <ul className="text-sm text-gray-700 md:hidden">
          <li className="px-4 py-2 border-t border-gray-100">
            Real-Time Communication at any modern browser.
          </li>
          <li className="px-4 py-2 border-t border-gray-100">
            The yellow border tells you who is talking, instantly.
          </li>
        </ul>
      </section>
      <section className="max-w-lg mx-auto mt-4 bg-white">
        <h2 className="px-4 pt-4 font-bold">Keep in touch with Yolk Link</h2>
        <p className="px-4 pb-4 mt-1 text-xs leading-tight text-gray-500">
          We send a newsletter every 4-8 weeks, and only when we have something
          important to say. You can unsubscribe at any time.
        </p>
        <div className="p-4 border-t border-gray-100">
          <form
            action="https://link.us4.list-manage.com/subscribe/post?u=835d1734463030dbb86a006b9&amp;id=e7ab6e45d6"
            method="post"
            target="_blank"
            className="flex"
          >
            <input
              type="email"
              name="EMAIL"
              placeholder="youremail@domain.com"
              className="flex-1 text-gray-700 border-b border-b-2 appearance-none focus:outline-none"
            />
            <div className="hidden" aria-hidden="true">
              <input
                type="text"
                name="b_835d1734463030dbb86a006b9_e7ab6e45d6"
                tabIndex={-1}
              />
            </div>
            <Button
              type="submit"
              className="px-2 py-1 ml-2 font-semibold text-yellow-500 bg-transparent border border-yellow-500 hover:bg-yellow-600 hover:text-white hover:border-transparent"
            >
              Subscribe
            </Button>
          </form>
        </div>
      </section>
      <footer className="my-8">
        <p className="text-center text-gray-500">
          Made by{' '}
          <a
            href="https://lzl.dev"
            className="border-b hover:text-gray-700 hover:border-gray-700"
          >
            LZL
          </a>{' '}
          with{' '}
          <span role="img" aria-label="heart">
            ❤️
          </span>
        </p>
      </footer>
    </>
  )
}

export default Home
