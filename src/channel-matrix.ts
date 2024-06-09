export function getChannel(base: string, channel: string): string {
  switch (base) {
    case 'core24':
    case 'core22':
    case 'core20':
      return channel
    case 'core18':
      if (channel.startsWith('5.x/')) {
        return channel
      }
      if (['stable', 'candidate', 'beta', 'edge'].includes(channel)) {
        return `5.x/${channel}`
      }
    case 'core':
      if (channel.startsWith('4.x/')) {
        return channel
      }
      if (['stable', 'candidate', 'beta', 'edge'].includes(channel)) {
        return `4.x/${channel}`
      }
  }

  throw new Error(
    `Snapcraft Channel '${channel}' is unsupported for builds targetting the '${base}' Base Snap.`
  )
}
