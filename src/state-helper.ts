import * as core from '@actions/core'

export const isPost = !!process.env['STATE_isPost']
export const tmpDir = process.env['STATE_tmpDir'] || ''

export function setTmpDir(dir: string): void {
  core.saveState('tmpDir', dir)
}

if (!isPost) {
  core.saveState('isPost', 'true')
}
