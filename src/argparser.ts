// -*- mode: javascript; js-indent-level: 2 -*-

export function parseArgs(argumentsString: string): string[] {
  let param = ''
  let char: string | undefined
  const charArray: string[] = argumentsString.split('')
  let args: string[] = []
  while ((char = charArray.shift())) {
    let subChar: string | undefined
    switch (char) {
      case '"':
      case "'":
        param += char
        while ((subChar = charArray.shift())) {
          if (subChar === char) {
            args = args.concat(param + subChar)
            param = ''
            break
          } else if (subChar) {
            param += subChar
            if (subChar === '\\') {
              param += charArray.shift()
            }
          }
        }
        break
      case '\\':
        param += char
        param += charArray.shift()
        break
      case ' ':
        if (param) {
          args = args.concat(param)
        }
        param = ''
        break
      default:
        param += char
    }
  }
  if (param) {
    args = args.concat(param)
  }
  return args
}
