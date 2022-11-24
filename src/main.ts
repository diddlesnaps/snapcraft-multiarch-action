// -*- mode: javascript; js-indent-level: 2 -*-

import * as os from 'os'
import * as core from '@actions/core'
import {SnapcraftBuilder} from './build'

async function run(): Promise<void> {
  try {
    if (os.platform() !== 'linux') {
      throw new Error(`Only supported on linux platform`)
    }

    const path = core.getInput('path')
    const usePodman =
      (core.getInput('use-podman') ?? 'true').toUpperCase() === 'TRUE'
    const buildInfo =
      (core.getInput('build-info') ?? 'true').toUpperCase() === 'TRUE'
    core.info(`Building Snapcraft project in "${path}"...`)
    const snapcraftChannel = core.getInput('snapcraft-channel')
    const snapcraftArgs = core.getInput('snapcraft-args')
    const architecture = core.getInput('architecture')
    const environment = core.getInput('environment')

    const builder = new SnapcraftBuilder(
      path,
      buildInfo,
      snapcraftChannel,
      snapcraftArgs,
      architecture,
      environment,
      usePodman
    )
    await builder.build()
    const snap = await builder.outputSnap()
    core.setOutput('snap', snap)
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

run()
