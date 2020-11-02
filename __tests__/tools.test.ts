// -*- mode: javascript; js-indent-level: 2 -*-

import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as exec from '@actions/exec'
import * as tools from '../src/tools'
import {FileHandle} from 'fs/promises'

afterEach(() => {
  jest.restoreAllMocks()
})

test('ensureDisabledAppArmorRules disables AppArmor rules if needed', async () => {
  expect.assertions(4)

  const accessMock = jest
    .spyOn(fs.promises, 'access')
    .mockImplementation(
      async (
        filename: fs.PathLike,
        mode?: number | undefined
      ): Promise<void> => {}
    )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDisabledAppArmorRules()

  expect(accessMock).toHaveBeenCalled()
  expect(execMock).toHaveBeenNthCalledWith(1, 'sudo', ['aa-enabled'])
  expect(execMock).toHaveBeenNthCalledWith(2, 'sudo', [
    'mv',
    '/etc/apparmor.d/usr.lib.snapd.snap-confine.real',
    '/etc/apparmor.d/disable/'
  ])
  expect(execMock).toHaveBeenNthCalledWith(3, 'sudo', [
    'apparmor_parser',
    '-R',
    '/etc/apparmor.d/disable/usr.lib.snapd.snap-confine.real'
  ])
})

test('ensureDisabledAppArmorRules is no-op if rules not present', async () => {
  expect.assertions(3)

  const accessMock = jest.spyOn(fs.promises, 'access').mockImplementation(
    async (filename: fs.PathLike, mode?: number | undefined): Promise<void> => {
      throw new Error('not found')
    }
  )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDisabledAppArmorRules()

  expect(accessMock).toHaveBeenCalled()
  expect(execMock).toHaveBeenCalledWith('sudo', ['aa-enabled'])
  expect(execMock).not.toHaveBeenCalledWith('sudo', [
    'apparmor_parser',
    '-R',
    '/etc/apparmor.d/disable/usr.lib.snapd.snap-confine.real'
  ])
})

test('ensureDockerExperimental is no-op if experimental already set', async () => {
  expect.assertions(3)

  const accessMock = jest
    .spyOn(fs.promises, 'access')
    .mockImplementation(
      async (
        filename: fs.PathLike,
        mode?: number | undefined
      ): Promise<void> => {}
    )
  const readMock = jest
    .spyOn(fs.promises, 'readFile')
    .mockImplementation(
      async (filename: fs.PathLike | fs.promises.FileHandle): Promise<Buffer> =>
        Buffer.from(`{"experimental": true}`)
    )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDockerExperimental()

  expect(accessMock).toHaveBeenCalled()
  expect(readMock).toHaveBeenCalled()
  expect(execMock).not.toHaveBeenCalled()
})

test("ensureDockerExperimental sets experimental mode and restarts docker if configuration file doesn't exist", async () => {
  expect.assertions(3)

  const accessMock = jest.spyOn(fs.promises, 'access').mockImplementation(
    async (filename: fs.PathLike, mode?: number | undefined): Promise<void> => {
      throw new Error('not found')
    }
  )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDockerExperimental()

  expect(accessMock).toHaveBeenCalled()
  expect(execMock).toHaveBeenNthCalledWith(1, 'bash', [
    '-c',
    `echo '{\"experimental\":true}' | sudo tee /etc/docker/daemon.json`
  ])
  expect(execMock).toHaveBeenNthCalledWith(2, 'sudo', [
    'systemctl',
    'restart',
    'docker'
  ])
})

test('ensureDockerExperimental sets experimental mode and restarts docker if not already set', async () => {
  expect.assertions(4)

  const accessMock = jest
    .spyOn(fs.promises, 'access')
    .mockImplementation(
      async (
        filename: fs.PathLike,
        mode?: number | undefined
      ): Promise<void> => {}
    )
  const readMock = jest
    .spyOn(fs.promises, 'readFile')
    .mockImplementation(
      async (filename: fs.PathLike | fs.promises.FileHandle): Promise<Buffer> =>
        Buffer.from(`{}`)
    )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDockerExperimental()

  expect(accessMock).toHaveBeenCalled()
  expect(readMock).toHaveBeenCalled()
  expect(execMock).toHaveBeenNthCalledWith(1, 'bash', [
    '-c',
    `echo '{\"experimental\":true}' | sudo tee /etc/docker/daemon.json`
  ])
  expect(execMock).toHaveBeenNthCalledWith(2, 'sudo', [
    'systemctl',
    'restart',
    'docker'
  ])
})

test('ensureDockerExperimental sets experimental mode and restarts docker if explicitly disabled', async () => {
  expect.assertions(4)

  const accessMock = jest
    .spyOn(fs.promises, 'access')
    .mockImplementation(
      async (
        filename: fs.PathLike,
        mode?: number | undefined
      ): Promise<void> => {}
    )
  const readMock = jest
    .spyOn(fs.promises, 'readFile')
    .mockImplementation(
      async (filename: fs.PathLike | fs.promises.FileHandle): Promise<Buffer> =>
        Buffer.from(`{"experimental": false}`)
    )
  const execMock = jest.spyOn(exec, 'exec').mockImplementation(
    async (program: string, args?: string[]): Promise<number> => {
      return 0
    }
  )

  await tools.ensureDockerExperimental()

  expect(accessMock).toHaveBeenCalled()
  expect(readMock).toHaveBeenCalled()
  expect(execMock).toHaveBeenNthCalledWith(1, 'bash', [
    '-c',
    `echo '{\"experimental\":true}' | sudo tee /etc/docker/daemon.json`
  ])
  expect(execMock).toHaveBeenNthCalledWith(2, 'sudo', [
    'systemctl',
    'restart',
    'docker'
  ])
})
