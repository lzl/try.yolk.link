import React, { useState, useEffect } from 'react'
import { Link, RouteComponentProps } from '@reach/router'
import { Helmet } from 'react-helmet'
import nanoid from 'nanoid'
import Button from '../component/Button'
import packageJson from '../../package.json'

const Home = (props: RouteComponentProps) => {
  const [isLoading, setIsLoading] = useState(true)
  const [roomId, setRoomId] = useState('')
  const [recentRooms, setRecentRooms] = useState([])

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
      // navigate(`/${roomId}`);
      setRoomId(roomId)
      setIsLoading(false)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      <Helmet>
        <title>Yolk Link v{packageJson.version}</title>
      </Helmet>

      <header className="max-w-lg mx-auto text-center bg-white">
        <h1 className="pt-8 text-4xl font-bold leading-none text-gray-900 sm:mt-8">
          Give Yolk Link a try
        </h1>
        <h2 className="mt-4 text-xl leading-snug text-gray-700">
          <p>A link connects you with</p>
          <p>
            your <span>client</span> <em>face-to-face</em>
          </p>
        </h2>
      </header>

      <main>
        <section className="flex items-center justify-center max-w-lg p-8 mx-auto bg-white">
          {roomId ? (
            <Link to={roomId}>
              <Button
                disabled={isLoading}
                loading={isLoading}
                className="px-4 py-2 font-bold text-white bg-yellow-500 hover:bg-yellow-700"
              >
                Go to your Yolk Link
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleCreateRoomId}
              disabled={isLoading}
              loading={isLoading}
              className="px-4 py-2 font-bold text-white bg-yellow-500 hover:bg-yellow-700"
            >
              Get Started
            </Button>
          )}
        </section>
        {recentRooms.length > 0 && (
          <section className="max-w-lg mx-auto mt-4 bg-white">
            <h2 className="px-4 py-2 font-bold">Continue with</h2>
            <ul>
              {recentRooms.map(({ roomId }: any) => (
                <li key={roomId} className="border-t border-gray-100">
                  <Link
                    to={roomId}
                    className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 hover:bg-yellow-700 hover:text-white"
                  >
                    <div>Who and who</div>
                    <div>{roomId}</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  )
}

export default Home
