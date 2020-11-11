// -*- mode: javascript; js-indent-level: 2 -*-

import * as os from 'os'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {SnapcraftBuilder} from './build'
import * as stateHelper from './state-helper'

async function run(): Promise<void> {
  try {
    if (os.platform() !== 'linux') {
      throw new Error(`Only supported on linux platform`)
    }

    const path = core.getInput('path')
    const buildInfo =
      (core.getInput('build-info') || 'true').toUpperCase() === 'TRUE'
    core.info(`Building Snapcraft project in "${path}"...`)
    const snapcraftChannel = core.getInput('snapcraft-channel')
    const snapcraftArgs = core.getInput('snapcraft-args')
    const platform = core.getInput('platform')
    const environment = core.getInput('environment')

    const builder = new SnapcraftBuilder(
      path,
      buildInfo,
      snapcraftChannel,
      snapcraftArgs,
      platform,
      environment
    )
    await builder.build()
    const snap = await builder.outputSnap()
    core.setOutput('snap', snap)
  } catch (error) {
    core.setFailed(error.message)
  }
}

async function cleanup(): Promise<void> {
  await exec.exec('sudo', [
    'rmdir',
    '/sys/kernel/security/apparmor/policy/namespaces/docker-snapcraft'
  ])
}

if (!stateHelper.isPost) {
  run()
} else {
  cleanup()
}
