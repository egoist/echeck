#!/usr/bin/env node
'use strict'
const path = require('path')
const spawn = require('child_process').spawn
const cac = require('cac')
const chalk = require('chalk')
const figures = require('figures')
const globby = require('globby')
const co = require('co')

const cli = cac(`
  Usage:
    echeck [patterns]

  Options:
    --esnext          Use esnext config for eslint
    --browser         Use browser config for eslint
    --quiet           Report error-level logs only
    -v, --version     Print version
    -h, --help        Print help (You are here!)
`, {
  boolean: ['esnext', 'browser', 'quiet'],
  default: {
    ignore: [
      '**/node_modules/**',
      '**/bower_components/**',
      'coverage/**',
      '{tmp,temp}/**',
      '**/*.min.js',
      '**/bundle.js',
      'fixture{-*,}.{js,jsx}',
      'fixture{s,}/**',
      '{test,tests,spec,__tests__}/fixture{s,}/**',
      'vendor/**',
      'dist/**'
    ]
  }
})

const cmds = []
let hasError = false

const lint = co.wrap(function* lint(patterns, options) {
  if (patterns.length === 0) {
    patterns = ['**/*.{js,jsx}']
  }

  const file = options.esnext ?
    'esnext.js' :
    options.browser ?
    'browser.js' :
    'index.js'

  const eslint = path.join(__dirname, `node_modules/.bin/eslint`)
  cmds.push({
    message: `${chalk.blue(`==>`)} ESLint...`,
    bin: eslint,
    args: [
      '--config', `eslint-config-egoist/${file}`,
      options.quiet ? '--quiet' : '--no-quiet'
    ].concat(yield globby(patterns, {ignore: options.ignore}))
  })
})

function next() {
  if (!cmds.length) return done()

  const cmd = cmds.shift()
  console.log(cmd.message)
  const proc = spawn(cmd.bin, cmd.args, {stdio: 'inherit'})

  proc.on('error', err => {
    console.log(err.stack || err.message || err)
    hasError = true
  })

  proc.on('close', code => {
    if (code !== 0) {
      hasError = true
    }
    next()
  })
}

function done() {
  if (hasError) {
    console.log(chalk.red(`${figures.cross} Failed! `))
    process.exit(1)
  } else {
    console.log(`${chalk.green(`${figures.tick} All good! `)}✨`)
    process.exit()
  }
}

cli.command('*', function* () {
  yield lint(this.input, this.flags)
  next()
})

cli.parse()
