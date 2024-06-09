// -*- mode: javascript; js-indent-level: 2 -*-

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tools from './tools'
import {parseArgs} from './argparser'
import {getChannel} from './channel-matrix'

interface ImageInfo {
  'build-request-id'?: string
  'build-request-timestamp'?: string
  // eslint-disable-next-line @typescript-eslint/naming-convention
  build_url?: string
}

function expandHome(p: string): string {
  if (p === '~' || p.startsWith('~/')) {
    p = os.homedir() + p.slice(1)
  } else if (!path.isAbsolute(p)) {
    p = path.join(process.cwd(), p)
  }
  return p
}

export const platforms: {[key: string]: string} = {
  i386: 'linux/386',
  amd64: 'linux/amd64',
  armhf: 'linux/arm/v7',
  arm64: 'linux/arm64',
  ppc64el: 'linux/ppc64le',
  s390x: 'linux/s390x'
}

export class SnapcraftBuilder {
  projectRoot: string
  includeBuildInfo: boolean
  snapcraftChannel: string
  snapcraftArgs: string[]
  architecture: string
  environment: {[key: string]: string}
  usePodman: boolean
  storeAuth: string

  constructor(
    projectRoot: string,
    includeBuildInfo: boolean,
    snapcraftChannel: string,
    snapcraftArgs: string,
    architecture: string,
    environment: string[],
    usePodman: boolean,
    storeAuth: string
  ) {
    this.projectRoot = expandHome(projectRoot)
    this.includeBuildInfo = includeBuildInfo
    this.snapcraftChannel = snapcraftChannel
    this.snapcraftArgs = parseArgs(snapcraftArgs)
    this.architecture = architecture
    this.usePodman = usePodman
    this.storeAuth = storeAuth

    const envKV: {[key: string]: string} = {}
    for (const env of environment) {
      const [key, value] = env.split('=', 2)
      envKV[key] = value
    }
    this.environment = envKV
  }

  async build(): Promise<void> {
    if (!this.usePodman) {
      await tools.ensureDockerExperimental()
    }
    const base = await tools.detectBase(this.projectRoot)

    if (!['core', 'core18', 'core20', 'core22', 'core24'].includes(base)) {
      throw new Error(
        `Your build requires a base that this tool does not support (${base}). 'base' or 'build-base' in your 'snapcraft.yaml' must be one of 'core', 'core18', 'core20', 'core22' or 'core24'.`
      )
    }

    if (base === 'core' && !(await tools.detectCGroupsV1())) {
      throw new Error(
        `Your build specified 'core' as the base, but your system is using cgroups v2. 'core' does not support cgroups v2. Please use 'core18' or later or an older Linux distribution that uses CGroups version 1 instead.`
      )
    }

    const imageInfo: ImageInfo = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      build_url: `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    }
    // Copy and update environment to pass to snapcraft
    const env: {[key: string]: string} = this.environment
    env['SNAPCRAFT_IMAGE_INFO'] = JSON.stringify(imageInfo)
    if (this.includeBuildInfo) {
      env['SNAPCRAFT_BUILD_INFO'] = '1'
    }
    if (this.snapcraftChannel !== '') {
      env['USE_SNAPCRAFT_CHANNEL'] = getChannel(base, this.snapcraftChannel)
    }
    if (this.storeAuth !== '') {
      env['SNAPCRAFT_STORE_CREDENTIALS'] = this.storeAuth
    }

    let dockerArgs: string[] = []
    let pullArgs: string[] = []
    if (this.architecture in platforms) {
      dockerArgs = dockerArgs.concat('--platform', platforms[this.architecture])
      pullArgs = pullArgs.concat('--platform', platforms[this.architecture])
    }

    for (const key in env) {
      dockerArgs = dockerArgs.concat('--env', `${key}=${env[key]}`)
    }

    let command = 'docker'
    let containerImage = `diddledani/snapcraft:${base}`
    if (this.usePodman) {
      command = 'sudo podman'
      containerImage = `docker.io/${containerImage}`
      dockerArgs = dockerArgs.concat('--systemd', 'always')
    }

    await exec.exec(command, ['pull', ...pullArgs, containerImage], {
      cwd: this.projectRoot
    })

    await exec.exec(
      command,
      [
        'run',
        '--rm',
        '--tty',
        '--privileged',
        '--volume',
        `${this.projectRoot}:/data`,
        '--workdir',
        '/data',
        ...dockerArgs,
        containerImage,
        'snapcraft',
        ...this.snapcraftArgs
      ],
      {
        cwd: this.projectRoot
      }
    )
  }

  // This wrapper is for the benefit of the tests, due to the crazy
  // typing of fs.promises.readdir()
  async _readdir(dir: string): Promise<string[]> {
    return await fs.promises.readdir(dir)
  }

  async outputSnap(): Promise<string> {
    const workspace = process.env['GITHUB_WORKSPACE'] ?? process.cwd()

    const files = await this._readdir(this.projectRoot)
    const snaps = files.filter(name => name.endsWith('.snap'))

    if (snaps.length === 0) {
      throw new Error('No snap files produced by build')
    }
    if (snaps.length > 1) {
      core.warning(`Multiple snaps found in ${this.projectRoot}`)
    }
    const snap = path.join(this.projectRoot, snaps[0]).replace(workspace, '.')
    await exec.exec('sudo', ['chown', process.getuid().toString(), snap])
    return snap
  }
}
