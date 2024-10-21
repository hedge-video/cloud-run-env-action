const fs = require('node:fs/promises')
const dotenv = require('dotenv')

/**
 * @param {string} filePath
 * @returns {object}
 */
async function parse(filePath) {
  const file = await fs.readFile(filePath, { encoding: 'utf8' })

  return dotenv.parse(file)
}

/**
 * Simplified version of the Linux native envsubst() method.
 *
 * Currently unsupported features:
 * - Any fallbacks ${NOTSET:=$BAR}
 * - Escaping using $$
 * @param {string} input
 * @param {object} [env]
 * @returns {string}
 */
function envsubst(input, env = process.env) {
  const varPattern =
    /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}|\$([a-zA-Z_][a-zA-Z0-9_]*)/g

  // Replace all instances of ${VAR} or $VAR with their corresponding environment values
  const result = input.replace(
    varPattern,
    (_, bracketVariant, dollarVariant) => {
      const varName = bracketVariant || dollarVariant

      // When env does not exist, fallback to the original token ($FOO or ${FOO})
      return (
        env[varName] ??
        (bracketVariant ? `\${${bracketVariant}}` : `$${dollarVariant}`)
      )
    }
  )

  return result
}

module.exports = {
  parse,
  envsubst
}
