// -*- mode: javascript; js-indent-level: 2 -*-

import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

const dockerJson = '/etc/docker/daemon.json'

async function haveFile(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.R_OK)
  } catch (err) {
    return false
  }
  return true
}

export async function ensureDisabledAppArmorRules(): Promise<void> {
  await exec.exec('sudo', [
    'mkdir',
    '/sys/kernel/security/apparmor/policy/namespaces/docker-snapcraft'
  ])
}

export async function ensureDockerExperimental(): Promise<void> {
  let json: {[key: string]: string | boolean} = {}
  if (await haveFile(dockerJson)) {
    json = JSON.parse(
      await fs.promises.readFile(dockerJson, {encoding: 'utf-8'})
    )
  }
  if (!('experimental' in json) || json['experimental'] !== true) {
    json['experimental'] = true
    await exec.exec('bash', [
      '-c',
      `echo '${JSON.stringify(json)}' | sudo tee /etc/docker/daemon.json`
    ])
    await exec.exec('sudo', ['systemctl', 'restart', 'docker'])
  }
}

async function findSnapcraftYaml(projectRoot: string): Promise<string> {
  const filePaths = [
    path.join(projectRoot, 'snap', 'snapcraft.yaml'),
    path.join(projectRoot, 'snapcraft.yaml'),
    path.join(projectRoot, '.snapcraft.yaml')
  ]
  for (const filePath of filePaths) {
    if (await haveFile(filePath)) {
      return filePath
    }
  }
  throw new Error('Cannot find snapcraft.yaml')
}

interface SnapcraftYaml {
  base: string | undefined
  'build-base': string | undefined
  [key: string]: string | number | Object | string[] | undefined
}
export async function detectBase(projectRoot: string): Promise<string> {
  const snapcraftFile = await findSnapcraftYaml(projectRoot)
  const snapcraftYaml: SnapcraftYaml = yaml.safeLoad(
    await fs.promises.readFile(snapcraftFile, 'utf-8')
  ) as SnapcraftYaml
  if (snapcraftYaml === undefined) {
    throw new Error('Cannot parse snapcraft.yaml')
  }
  if (snapcraftYaml['build-base']) {
    return snapcraftYaml['build-base']
  }
  if (snapcraftYaml.base) {
    return snapcraftYaml.base
  }
  return 'core'
}
