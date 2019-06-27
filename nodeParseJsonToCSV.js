/***
 * Usage: node nodeParseJsonToCSV (no arguments)
 */
'use strict'

const INPUT_DIR = 'output/'
const OUTPUT_PATH = './'
const profileFileName = '__profile.json'

const fs = require('fs')
const path = require('path')
const j2c = require('json-2-csv')
// const async = require('async')

const profileOptions = {
  delimiter: {
    field: '\t' // and no wrap
  },
  prependHeader: true,
  keys: [
    'username',
    'id',
    'full_name',
    'biography',
    'followed_by.count',
    'follows.count',
    'media.count',
    'profile_pic_url',
    'is_verified'
  ]
}

const postOptions = {
  delimiter: {
    field: '\t' // and no wrap
  },
  prependHeader: true,
  keys: [
    'username',
    'code',
    'caption',
    'comments.count',
    'likes.count',
    'date',
    'dimensions.height',
    'dimensions.width',
    'is_video',
    // 'display_src', // don't need this since it expires and we already download the image anyway
    'location.id',
    'location.name',
    'usertags.count', // derived from usertags.nodes array
    'usertags.flattened' // flattened from usertags.nodes array
  ]
}

const commentOptions = {
  delimiter: {
    field: '\t' // and no wrap
  },
  prependHeader: true,
  keys: [
    'code',
    'id',
    'created_at',
    'text',
    'user.id',
    'user.username'
  // 'user.profile_pic_url'
  ]
}

console.log('ARGS: ' + process.argv.slice(2))
console.log('===================')

// get all usernames (names of all folders)
let usernames = fs.readdirSync(INPUT_DIR).filter(f => {
  return fs.statSync(path.join(INPUT_DIR, f)).isDirectory()
})

// debug
console.log(usernames)

usernames.forEach(uDir => {
  // try to process __profile.json
  processProfile(path.join(INPUT_DIR, uDir, profileFileName))
  // try to process post and comment json files
  processPostsAndComments(uDir, path.join(INPUT_DIR, uDir))
})

console.log('finished parsing. Wait for files to finish writing ...')

function processProfile (file) {
  console.log('attemping to parse ' + file)
  try {
    let data = fs.readFileSync(file)
    if (data) {
      let profile = JSON.parse(data.toString()).user
      if (profile.biography) {
        profile.biography = profile.biography.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ')
      }

      j2c.json2csv(profile, (err, csv) => {
        if (err) printErrAndExit(err)
        fs.appendFileSync(`${OUTPUT_PATH}profiles.csv`, csv)
      }, profileOptions)
    } else {
      throw Error()
    }
  } catch (error) {
    console.error('processing failed for ' + file)
  }
}

function processPostsAndComments (username, uDir) {
  console.log('attemping parse to json files in ' + uDir)

  let files = fs.readdirSync(uDir)

  if (files) {
    files.forEach(f => {
      let filePath = path.join(uDir, f)
      if (f.endsWith('comments-init.json')) {
        processPostFile(username, filePath)
      }

      if (f.endsWith('comments.json')) {
        let code = /(.+)-comments/.exec(f)[1]
        processCommentFile(code, filePath)
      }
    })
  }
}

function processPostFile (username, f) {
  let file = fs.readFileSync(f)

  // append username, fix dates, remove \n, flatten usertags
  let post = JSON.parse(file.toString())
  post.username = username
  processPost(post)

  // write post to csv
  j2c.json2csv(post, (err, csv) => {
    if (err) printErrAndExit(err)
    fs.appendFileSync(`${OUTPUT_PATH}posts.csv`, csv)
  }, postOptions)

  processComments(post.code, post.comments.nodes)

  // write comments in init.json to csv
  j2c.json2csv(post.comments.nodes, (err, csv) => {
    if (err) printErrAndExit(err)
    fs.appendFileSync(`${OUTPUT_PATH}comments.csv`, csv)
  }, commentOptions)
}

function processPost (p) {
  p.date = convertToExcelDate(p.date)
  if (p.caption) {
    p.caption = p.caption.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ')
  }

  p.usertags.count = p.usertags.nodes.length

  p.usertags.flattened = ''
  p.usertags.nodes
    .sort(compareTag)
    .forEach(t => {
      p.usertags.flattened += (t.user.username + ';')
    // console.log(p.usertags.flattened)
    })

  p.usertags.nodes = ''
}

function compareTag (a, b) {
  if (a.user.username < b.user.username) return -1
  if (a.user.username > b.user.username) return 1
  return 0
}

function processCommentFile (code, f) {
  // console.log('comment file: ' + f)
  let file = fs.readFileSync(f, 'utf8')

  let commentsArray = JSON.parse(file.toString())

  // append code, fix dates, flatten usertags
  commentsArray.forEach(comments => {
    processComments(code, comments.nodes)

    j2c.json2csv(comments.nodes, (err, csv) => {
      if (err) printErrAndExit(err)
      fs.appendFileSync(`${OUTPUT_PATH}comments.csv`, csv)
    }, commentOptions)
  })
}

function processComments (code, commentNodes) {
  // append code, fix dates
  commentNodes.forEach(c => {
    c.code = code
    c.created_at = convertToExcelDate(c.created_at)
    c.text = c.text.replace(/\r/g, ' ').replace(/\n/g, ' ').replace(/\t/g, ' ')
  })
}

function convertToExcelDate (unixTimestamp) {
  let d = new Date(Number(unixTimestamp) * 1000)
  let excelDate = d.getFullYear() + '-' +
  pad(1 + d.getMonth()) + '-' +
  pad(d.getDate()) + ' ' +
  pad(d.getHours()) + ':' +
  pad(d.getMinutes()) + ':' +
  pad(d.getSeconds())

  return excelDate
}

function pad (n) {
  return n < 10 ? '0' + n : n
}

function printErrAndExit (e) {
  console.error(e)
  process.exit(-1)
}
