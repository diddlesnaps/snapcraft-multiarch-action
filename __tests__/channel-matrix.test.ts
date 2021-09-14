import {getChannel} from '../src/channel-matrix'

for (const [base, channel, expected] of [
  ['core', 'stable', '4.x/stable'],
  ['core', 'candidate', '4.x/candidate'],
  ['core', 'beta', '4.x/beta'],
  ['core', 'edge', '4.x/edge'],
  ['core', '4.x/stable', '4.x/stable'],
  ['core', '4.x/candidate', '4.x/candidate'],
  ['core', '4.x/beta', '4.x/beta'],
  ['core', '4.x/edge', '4.x/edge'],
  ['core18', 'stable', '5.x/stable'],
  ['core18', 'candidate', '5.x/candidate'],
  ['core18', 'beta', '5.x/beta'],
  ['core18', 'edge', '5.x/edge'],
  ['core18', '4.x/stable', '4.x/stable'],
  ['core18', '4.x/candidate', '4.x/candidate'],
  ['core18', '4.x/beta', '4.x/beta'],
  ['core18', '4.x/edge', '4.x/edge'],
  ['core18', '5.x/stable', '5.x/stable'],
  ['core18', '5.x/candidate', '5.x/candidate'],
  ['core18', '5.x/beta', '5.x/beta'],
  ['core18', '5.x/edge', '5.x/edge'],
  ['core20', 'stable', 'stable'],
  ['core20', 'candidate', 'candidate'],
  ['core20', 'beta', 'beta'],
  ['core20', 'edge', 'edge'],
  ['core20', '4.x/stable', '4.x/stable'],
  ['core20', '4.x/candidate', '4.x/candidate'],
  ['core20', '4.x/beta', '4.x/beta'],
  ['core20', '4.x/edge', '4.x/edge'],
  ['core20', '5.x/stable', '5.x/stable'],
  ['core20', '5.x/candidate', '5.x/candidate'],
  ['core20', '5.x/beta', '5.x/beta'],
  ['core20', '5.x/edge', '5.x/edge']
]) {
  test(`getChannel for '${base}' and '${channel}' returns '${expected}'`, () => {
    expect.assertions(1)
    expect(getChannel(base, channel)).toEqual(expected)
  })
}

for (const [base, channel] of [
  ['core', '5.x/stable'],
  ['core', '5.x/candidate'],
  ['core', '5.x/beta'],
  ['core', '5.x/edge']
]) {
  test(`getChannel for '${base}' and '${channel}' throws an error`, () => {
    expect.assertions(1)
    expect(() => getChannel(base, channel)).toThrow()
  })
}
