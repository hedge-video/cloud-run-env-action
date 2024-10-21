const { envsubst } = require('../src/env')

describe('envsubst()', () => {
  const fakeEnv = {
    BAR: 'bar',
    FOO: 'foo',
    EMPTY: '',
    ALSO_EMPTY: '',
    A: 'AAA'
  }

  const tests = [
    ['empty', '', ''],
    ['env only', '$BAR', 'bar'],
    ['with text', '$BAR baz', 'bar baz'],
    ['concatenated', '$BAR$FOO', 'barfoo'],
    ['2 env var', '$BAR - $FOO', 'bar - foo'],
    ['invalid var', '$_ bar', '$_ bar'],
    ['invalid subst var', '${_} bar', '${_} bar'],
    ['value of $var', '${BAR}baz', 'barbaz'],
    ['single character', '${A}', 'AAA']
  ]

  for (const [test, given, expected] of tests) {
    it(`handles ${test}`, () => {
      expect(envsubst(given, fakeEnv)).toBe(expected)
    })
  }
})
