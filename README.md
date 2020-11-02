<p align="center">
  <a href="https://github.com/diddlesnaps/snapcraft-multiarch-action/actions"><img alt="snapcraft-multiarch-build-action status" src="https://github.com/diddlesnaps/snapcraft-multiarch-action/workflows/build-test/badge.svg"></a>
</p>

# Snapcraft Multiarch Build Action

This is a Github Action that can be used to build a
[Snapcraft](https://snapcraft.io) project.  For most projects, the
following workflow should be sufficient:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - uses: diddlesnaps/snapcraft-multiarch-action@v1
```

This will run `snapcraft` using the [snapcraft-container](https://hub.docker.com/r/diddledan/snapcraft)

On success, the action will set the `snap` output parameter to the
path of the built snap.  This can be used to save it as an artifact of
the workflow:

```yaml
...
    - uses: diddlesnaps/snapcraft-multiarch-action@v1
      id: snapcraft
    - uses: actions/upload-artifact@v2
      with:
        name: snap
        path: ${{ steps.snapcraft.outputs.snap }}
```

Alternatively, it could be used to perform further testing on the built snap:

```yaml
    - run: |
        sudo snap install --dangerous ${{ steps.snapcraft.outputs.snap }}
        # do something with the snap
```

The action can also be chained with
[`snapcore/action-publish@v1`](https://github.com/snapcore/action-publish)
to automatically publish builds to the Snap Store.


## Multiple architectures support

This action supports building for multiple architectures using
the GitHub Actions matrix feature.

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        platform:
        - i386
        - amd64
        - armhf
        - arm64
        - ppc64
        - s390x
    steps:
    - uses: actions/checkout@v2
    - uses: docker/setup-qemu-action@v1
    - uses: diddlesnaps/snapcraft-multiarch-action@v1
      with:
        architecture: ${{ matrix.platform }}
```

notes
-----

* `s390x` is broken at the moment.
* `core20` builds against `armhf` are broken at the moment.
* `core20` builds do not support `i386` architecture because Ubuntu has dropped support for `i386` in Ubuntu 20.04 and later.
* `core` builds do not support `s390x` architecture because Ubuntu does not have support for `s390x` before Ubuntu 18.04.

## Action inputs

### `path`

If your Snapcraft project is not located in the root of the workspace,
you can specify an alternative location via the `path` input
parameter:

```yaml
...
    - uses: diddlesnaps/snapcraft-multiarch-action@v1
      with:
        path: path-to-snapcraft-project
```

### `build-info`

By default, the action will tell Snapcraft to include information
about the build in the resulting snap, in the form of the
`snap/snapcraft.yaml` and `snap/manifest.yaml` files.  Among other
things, these are used by the Snap Store's automatic security
vulnerability scanner to check whether your snap includes files from
vulnerable versions of Ubuntu packages.

This can be turned off by setting the `build-info` parameter to
`false`.

### `snapcraft-channel`

By default, the action will install Snapcraft from the stable
channel.  If your project relies on a feature not found in the stable
version of Snapcraft, then the `snapcraft-channel` parameter can be
used to select a different channel.

### `snapcraft-args`

The `snapcraft-args` parameter can be used to pass additional
arguments to Snapcraft.  This is primarily intended to allow the use
of experimental features by passing `--enable-experimental-*`
arguments to Snapcraft.

### `architecture`

By default, the action will build for AMD64. You may use this parameter
to indicate an alternative architecture from any of those supported by
the `snapcraft` utility. At the time of writing the supported
architectures are `amd64`, `i386`, `arm64`, `armhf`, `ppc64` and `s390x`.
This is most-useful when used with GitHub Actions' `matrix` feature.
