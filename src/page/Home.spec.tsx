import React from 'react'
import { render, fireEvent, waitForElement } from '@testing-library/react'

import Home from './Home'

const fetchMock = require('fetch-mock-jest')

it('Shows "Give Yolk Link a try"', () => {
  const { getByText } = render(<Home />)

  expect(getByText('Give Yolk Link a try')).not.toBeNull()
})

it('Shows "Get Started" button', () => {
  const { getByText } = render(<Home />)
  const button = getByText('Get Started')

  expect(button).not.toBeNull()
})

it('Shows "Go to your Yolk Link" button after create room', async () => {
  fetchMock.mock('/api/room-create', { roomId: 'fakeRoomId' })

  const { getByText } = render(<Home />)
  const button = getByText('Get Started')
  fireEvent.click(button)

  const title = 'Go to your Yolk Link'
  await waitForElement(() => getByText(title))

  expect(getByText(title)).not.toBeNull()
})

it('Should match Snapshot', () => {
  const { asFragment } = render(<Home />)

  expect(asFragment()).toMatchSnapshot()
})
