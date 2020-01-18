import React from 'react'
import { render } from '@testing-library/react'

import Home from './Home'

it('Shows "Give Yolk Link a try"', () => {
  const { getByText } = render(<Home />)

  expect(getByText('Give Yolk Link a try')).not.toBeNull()
})

it('Should match Snapshot', () => {
  const { asFragment } = render(<Home />)

  expect(asFragment()).toMatchSnapshot()
})
