// -*- mode: javascript; js-indent-level: 2 -*-

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as build from '../src/build'
import * as tools from '../src/tools'

afterEach(() => {
  jest.restoreAllMocks()
})

test('SnapcraftBuilder expands tilde in project root', () => {
  let builder = new build.SnapcraftBuilder('~', true, 'stable', '', '', '')
  expect(builder.projectRoot).toBe(os.homedir())

  builder = new build.SnapcraftBuilder('~/foo/bar', true, 'stable', '', '', '')
  expect(builder.projectRoot).toBe(path.join(os.homedir(), 'foo/bar'))
})

for (const base of ['core', 'core18', 'core20']) {
  test(`SnapcraftBuilder.build runs a snap build with base: ${base}`, async () => {
    expect.assertions(4)

    const ensureDisabledAppArmorRulesMock = jest
      .spyOn(tools, 'ensureDisabledAppArmorRules')
      .mockImplementation(async (): Promise<void> => {})
    const ensureDockerExperimentalMock = jest
      .spyOn(tools, 'ensureDockerExperimental')
      .mockImplementation(async (): Promise<void> => {})
    const detectBaseMock = jest
      .spyOn(tools, 'detectBase')
      .mockImplementation(async (projectRoot: string): Promise<string> => base)
    const execMock = jest.spyOn(exec, 'exec').mockImplementation(
      async (program: string, args?: string[]): Promise<number> => {
        return 0
      }
    )
    process.env['GITHUB_REPOSITORY'] = 'user/repo'
    process.env['GITHUB_RUN_ID'] = '42'

    const projectDir = 'project-root'
    const builder = new build.SnapcraftBuilder(
      projectDir,
      true,
      'stable',
      '',
      '',
      ''
    )
    await builder.build()

    expect(ensureDisabledAppArmorRulesMock).toHaveBeenCalled()
    expect(ensureDockerExperimentalMock).toHaveBeenCalled()
    expect(detectBaseMock).toHaveBeenCalled()
    expect(execMock).toHaveBeenCalledWith(
      'docker',
      [
        'run',
        '--rm',
        '--tty',
        '--privileged',
        '--volume',
        `${process.cwd()}/${projectDir}:/data`,
        '--workdir',
        '/data',
        '--env',
        'SNAPCRAFT_BUILD_ENVIRONMENT=host',
        '--env',
        `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
        '--env',
        'SNAPCRAFT_BUILD_INFO=1',
        '--env',
        'USE_SNAPCRAFT_CHANNEL=stable',
        `diddledan/snapcraft:${base}`,
        'snapcraft'
      ],
      {
        cwd: `${process.cwd()}/${projectDir}`
      }
    )
  })
}

test('SnapcraftBuilder.build can disable build info', async () => {
  expect.assertions(1)

  const ensureDisabledAppArmorRulesMock = jest
    .spyOn(tools, 'ensureDisabledAppArmorRules')
    .mockImplementation(async (): Promise<void> => {})
  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => {})
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(async (projectRoot: string): Promise<string> => 'core')
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  const builder = new build.SnapcraftBuilder('.', false, 'stable', '', '', '')
  await builder.build()

  expect(execMock).toHaveBeenCalledWith(
    'docker',
    [
      'run',
      '--rm',
      '--tty',
      '--privileged',
      '--volume',
      `${process.cwd()}:/data`,
      '--workdir',
      '/data',
      '--env',
      'SNAPCRAFT_BUILD_ENVIRONMENT=host',
      '--env',
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      'diddledan/snapcraft:core',
      'snapcraft'
    ],
    {
      cwd: expect.any(String)
    }
  )
})

test('SnapcraftBuilder.build can pass additional arguments', async () => {
  expect.assertions(1)

  const ensureDisabledAppArmorRulesMock = jest
    .spyOn(tools, 'ensureDisabledAppArmorRules')
    .mockImplementation(async (): Promise<void> => {})
  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => {})
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(async (projectRoot: string): Promise<string> => 'core')
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  const builder = new build.SnapcraftBuilder(
    '.',
    false,
    'stable',
    '--foo --bar',
    '',
    ''
  )
  await builder.build()

  expect(execMock).toHaveBeenCalledWith(
    'docker',
    [
      'run',
      '--rm',
      '--tty',
      '--privileged',
      '--volume',
      `${process.cwd()}:/data`,
      '--workdir',
      '/data',
      '--env',
      'SNAPCRAFT_BUILD_ENVIRONMENT=host',
      '--env',
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      'diddledan/snapcraft:core',
      'snapcraft',
      '--foo',
      '--bar'
    ],
    expect.anything()
  )
})

test('SnapcraftBuilder.outputSnap fails if there are no snaps', async () => {
  expect.assertions(2)

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(
    projectDir,
    true,
    'stable',
    '',
    '',
    ''
  )

  const readdir = jest
    .spyOn(builder, '_readdir')
    .mockImplementation(
      async (path: string): Promise<string[]> => ['not-a-snap']
    )

  await expect(builder.outputSnap()).rejects.toThrow(
    'No snap files produced by build'
  )
  expect(readdir).toHaveBeenCalled()
})

test('SnapcraftBuilder.outputSnap returns the first snap', async () => {
  expect.assertions(2)

  const projectDir = 'project-root'
  const builder = new build.SnapcraftBuilder(
    projectDir,
    true,
    'stable',
    '',
    '',
    ''
  )

  const readdir = jest
    .spyOn(builder, '_readdir')
    .mockImplementation(
      async (path: string): Promise<string[]> => ['one.snap', 'two.snap']
    )
  const warning = jest
    .spyOn(core, 'warning')
    .mockImplementation((_message: string | Error): void => {})

  await expect(builder.outputSnap()).resolves.toEqual(
    path.join(process.cwd(), 'project-root/one.snap')
  )
  expect(readdir).toHaveBeenCalled()
})
