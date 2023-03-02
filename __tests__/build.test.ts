// -*- mode: javascript; js-indent-level: 2 -*-

import * as os from 'os'
import * as path from 'path'
import * as process from 'process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as build from '../src/build'
import * as tools from '../src/tools'

const default_base = 'core22'

afterEach(() => {
  jest.restoreAllMocks()
})

test('SnapcraftBuilder expands tilde in project root', () => {
  let builder = new build.SnapcraftBuilder(
    '~',
    true,
    'stable',
    '',
    '',
    [],
    false,
    ''
  )
  expect(builder.projectRoot).toBe(os.homedir())

  builder = new build.SnapcraftBuilder(
    '~/foo/bar',
    true,
    'stable',
    '',
    '',
    [],
    false,
    ''
  )
  expect(builder.projectRoot).toBe(path.join(os.homedir(), 'foo/bar'))
})

let matrix: [string, string, string][] = []
for (const base of ['core', 'core18', 'core20', 'core22']) {
  for (const arch of [
    '',
    'amd64',
    'arm64',
    'armhf',
    'i386',
    'ppc64el',
    's390x'
  ]) {
    let channel = ''
    switch (base) {
      case 'core':
        channel = '4.x/stable'
        break
      case 'core18':
        channel = '5.x/stable'
        break
      default:
        channel = 'stable'
    }
    matrix.push([base, arch, channel])
  }
}
for (const [base, arch, channel] of matrix) {
  test(`SnapcraftBuilder.build runs a snap build using Docker with base: ${base}; and arch: ${arch}`, async () => {
    expect.assertions(4)

    const ensureDockerExperimentalMock = jest
      .spyOn(tools, 'ensureDockerExperimental')
      .mockImplementation(async (): Promise<void> => Promise.resolve())
    const detectBaseMock = jest
      .spyOn(tools, 'detectBase')
      .mockImplementation(
        async (projectRoot: string): Promise<string> => Promise.resolve(base)
      )
    const detectCGroupsV1Mock = jest
      .spyOn(tools, 'detectCGroupsV1')
      .mockImplementation(async (): Promise<boolean> => Promise.resolve(true))
    const execMock = jest
      .spyOn(exec, 'exec')
      .mockImplementation(
        async (program: string, args?: string[]): Promise<number> => 0
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
      [],
      false,
      ''
    )
    await builder.build()

    let platform: string[] = []
    if (arch && arch in build.platforms) {
      platform = ['--platform', build.platforms[arch]]
    }

    expect(ensureDockerExperimentalMock).toHaveBeenCalled()
    expect(detectBaseMock).toHaveBeenCalled()
    if (base === 'core') {
      expect(detectCGroupsV1Mock).toHaveBeenCalled()
    } else {
      expect(detectCGroupsV1Mock).not.toHaveBeenCalled()
    }
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
        ...platform,
        '--env',
        `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
        '--env',
        'SNAPCRAFT_BUILD_INFO=1',
        '--env',
        `USE_SNAPCRAFT_CHANNEL=${channel}`,
        `diddledani/snapcraft:${base}`,
        'snapcraft'
      ],
      {
        cwd: `${process.cwd()}/${projectDir}`
      }
    )
  })

  test(`SnapcraftBuilder.build runs a snap build using Podman with base: ${base}; and arch: ${arch}`, async () => {
    expect.assertions(4)
    const ensureDockerExperimentalMock = jest
      .spyOn(tools, 'ensureDockerExperimental')
      .mockImplementation(async (): Promise<void> => Promise.resolve())
    const detectBaseMock = jest
      .spyOn(tools, 'detectBase')
      .mockImplementation(
        async (projectRoot: string): Promise<string> => Promise.resolve(base)
      )
    const detectCGroupsV1Mock = jest
      .spyOn(tools, 'detectCGroupsV1')
      .mockImplementation(async (): Promise<boolean> => Promise.resolve(true))
    const execMock = jest
      .spyOn(exec, 'exec')
      .mockImplementation(
        async (program: string, args?: string[]): Promise<number> => 0
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
      [],
      true,
      ''
    )
    await builder.build()

    expect(ensureDockerExperimentalMock).not.toHaveBeenCalled()
    expect(detectBaseMock).toHaveBeenCalled()
    if (base === 'core') {
      expect(detectCGroupsV1Mock).toHaveBeenCalled()
    } else {
      expect(detectCGroupsV1Mock).not.toHaveBeenCalled()
    }
    expect(execMock).toHaveBeenCalledWith(
      'sudo podman',
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
        `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
        '--env',
        'SNAPCRAFT_BUILD_INFO=1',
        '--env',
        `USE_SNAPCRAFT_CHANNEL=${channel}`,
        '--systemd',
        'always',
        `docker.io/diddledani/snapcraft:${base}`,
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

  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => Promise.resolve())
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(
      async (projectRoot: string): Promise<string> => default_base
    )
  const execMock = jest
    .spyOn(exec, 'exec')
    .mockImplementation(
      async (program: string, args?: string[]): Promise<number> => 0
    )

  const builder = new build.SnapcraftBuilder(
    '.',
    false,
    'stable',
    '',
    '',
    [],
    false,
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
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      `diddledani/snapcraft:${default_base}`,
      'snapcraft'
    ],
    {
      cwd: expect.any(String)
    }
  )
})

test('SnapcraftBuilder.build can pass additional arguments', async () => {
  expect.assertions(1)

  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => Promise.resolve())
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(
      async (projectRoot: string): Promise<string> => default_base
    )
  const execMock = jest
    .spyOn(exec, 'exec')
    .mockImplementation(
      async (program: string, args?: string[]): Promise<number> => 0
    )

  const builder = new build.SnapcraftBuilder(
    '.',
    false,
    'stable',
    '--foo --bar',
    '',
    [],
    false,
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
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      `diddledani/snapcraft:${default_base}`,
      'snapcraft',
      '--foo',
      '--bar'
    ],
    expect.anything()
  )
})

test('SnapcraftBuilder.build can pass extra environment variables', async () => {
  expect.assertions(1)

  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => Promise.resolve())
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(
      async (projectRoot: string): Promise<string> => default_base
    )
  const execMock = jest
    .spyOn(exec, 'exec')
    .mockImplementation(
      async (program: string, args?: string[]): Promise<number> => 0
    )

  const builder = new build.SnapcraftBuilder(
    '.',
    false,
    'stable',
    '--foo --bar',
    '',
    ['FOO=bar', 'BAZ=qux'],
    false,
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
      'FOO=bar',
      '--env',
      'BAZ=qux',
      '--env',
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      `diddledani/snapcraft:${default_base}`,
      'snapcraft',
      '--foo',
      '--bar'
    ],
    expect.anything()
  )
})

test('SnapcraftBuilder.build adds store credentials', async () => {
  expect.assertions(1)

  const ensureDockerExperimentalMock = jest
    .spyOn(tools, 'ensureDockerExperimental')
    .mockImplementation(async (): Promise<void> => Promise.resolve())
  const detectBaseMock = jest
    .spyOn(tools, 'detectBase')
    .mockImplementation(
      async (projectRoot: string): Promise<string> => default_base
    )
  const execMock = jest
    .spyOn(exec, 'exec')
    .mockImplementation(
      async (program: string, args?: string[]): Promise<number> => 0
    )

  const builder = new build.SnapcraftBuilder(
    '.',
    false,
    'stable',
    '--foo --bar',
    '',
    [],
    false,
    'TEST_STORE_CREDENTIALS'
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
      `SNAPCRAFT_IMAGE_INFO={"build_url":"https://github.com/user/repo/actions/runs/42"}`,
      '--env',
      'USE_SNAPCRAFT_CHANNEL=stable',
      '--env',
      'SNAPCRAFT_STORE_CREDENTIALS=TEST_STORE_CREDENTIALS',
      `diddledani/snapcraft:${default_base}`,
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
    [],
    false,
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
    [],
    false,
    ''
  )

  const readdir = jest
    .spyOn(builder, '_readdir')
    .mockImplementation(
      async (path: string): Promise<string[]> => ['one.snap', 'two.snap']
    )
  const execMock = jest
    .spyOn(exec, 'exec')
    .mockImplementation(
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
