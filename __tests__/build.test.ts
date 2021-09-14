// -*- mode: javascript; js-indent-level: 2 -*-

import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as build from '../src/build'
import * as tools from '../src/tools'

const default_base = 'core20'

afterEach(() => {
  jest.restoreAllMocks()
})

test('SnapcraftBuilder expands tilde in project root', () => {
  let builder = new build.SnapcraftBuilder('~', true, 'stable', '', '', '')
  expect(builder.projectRoot).toBe(os.homedir())

  builder = new build.SnapcraftBuilder('~/foo/bar', true, 'stable', '', '', '')
  expect(builder.projectRoot).toBe(path.join(os.homedir(), 'foo/bar'))
})

for (const [base, arch, channel] of [
  ['core', '', '4.x/stable'],
  ['core', 'amd64', '4.x/stable'],
  ['core', 'i386', '4.x/stable'],
  ['core', 'arm64', '4.x/stable'],
  ['core', 'armhf', '4.x/stable'],
  ['core', 'ppc64el', '4.x/stable'],
  ['core18', '', '5.x/stable'],
  ['core18', 'amd64', '5.x/stable'],
  ['core18', 'i386', '5.x/stable'],
  ['core18', 'arm64', '5.x/stable'],
  ['core18', 'armhf', '5.x/stable'],
  ['core18', 'ppc64el', '5.x/stable'],
  ['core18', 's390x', '5.x/stable'],
  ['core20', '', 'stable'],
  ['core20', 'amd64', 'stable'],
  ['core20', 'i386', 'stable'],
  ['core20', 'arm64', 'stable'],
  ['core20', 'armhf', 'stable'],
  ['core20', 'ppc64el', 'stable'],
  ['core20', 's390x', 'stable']
]) {
  test(`SnapcraftBuilder.build runs a snap build with base: ${base}; and arch: ${arch}`, async () => {
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
      arch,
      ''
    )
    await builder.build()

    let platform: string[] = []
    if (arch && arch in build.platforms) {
      platform = ['--platform', build.platforms[arch]]
    }

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
        '--security-opt',
        'apparmor=:docker-snapcraft:unconfined',
        '--volume',
        `${process.cwd()}/${projectDir}:/data`,
        '--workdir',
        '/data',
        ...platform,
        '--env',
        'SNAPCRAFT_BUILD_ENVIRONMENT=host',
        '--env',
        `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
        '--env',
        'SNAPCRAFT_BUILD_INFO=1',
        '--env',
        `USE_SNAPCRAFT_CHANNEL=${channel}`,
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
    .mockImplementation(async (projectRoot: string): Promise<string> => default_base)
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
      '--security-opt',
      'apparmor=:docker-snapcraft:unconfined',
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
      `diddledan/snapcraft:${default_base}`,
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
    .mockImplementation(async (projectRoot: string): Promise<string> => default_base)
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
      '--security-opt',
      'apparmor=:docker-snapcraft:unconfined',
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
      `diddledan/snapcraft:${default_base}`,
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
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )
  const warning = jest
    .spyOn(core, 'warning')
    .mockImplementation((_message: string | Error): void => {})

  await expect(builder.outputSnap()).resolves.toEqual(
    path.join(process.cwd(), 'project-root/one.snap')
  )
  expect(readdir).toHaveBeenCalled()
})
