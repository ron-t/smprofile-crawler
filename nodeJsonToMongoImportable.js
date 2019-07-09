'use strict'

const path = require('path')
const fs = require('fs')
const _ = require('lodash')

/**
 * Expected input path structure (same as the output
 * from CasperJS scripts)
 * -------------------------------------------------
 * root/
 *  username1/
 *    __profile.json
 *    post1id.json
 *    post1id-comments-init.json
 *    post1id-comments.json
 *    postNid.json
 *    postNid-comments-init.json
 *    postNid-comments.json
 *  usernameN/
 *    __profile.json
 *    post1id.json
 *    post1id-comments-init.json
 *    post1id-comments.json
 *    postNid.json
 *    postNid-comments-init.json
 *    postNid-comments.json
 * */
const inDir = 'root'
const users = [
  'username1',
  // ...
  'usernameN'
]

_.each(users, user => {
  let userDir = path.join(inDir, user)

  let userFileNames = fs.readdirSync(userDir)

  const profile = getProfile(userDir)
  if (profile) {
    fs.writeFileSync(`${user}-profile.json`, JSON.stringify(profile))
  }

  let counter = 0
  userFileNames.forEach(fileName => {
    // ignore __profile and comment files here
    if (fileName.match(/^(__profile)|(.+-comments.*)\.json$/)) {
      return
    }
    const post = getPostAndComments(path.join(userDir, fileName))
    fs.appendFileSync(`${user}-posts.json`, JSON.stringify(post))

    counter++
  })

  console.log(`${user} ${counter}`)
})

process.exit(0)

function getProfile (dirOfUser) {
  let p

  try {
    const f = fs.readFileSync(path.join(dirOfUser, '__profile.json'))
    p = JSON.parse(f.toString()).user

    p._id = p.id

    delete p.id
    delete p.media.page_info
    delete p.requested_by_viewer
    delete p.blocked_by_viewer
    delete p.has_blocked_viewer
    delete p.has_requested_viewer
  } catch (e) {
    console.error(e)
    p = undefined
  }

  return p
}

function getPostAndComments (pathOfPost) {
  let post

  try {
    post = JSON.parse(fs.readFileSync(pathOfPost).toString())

    post._id = post.code
    post.comments = null

    const commentsInitFileName = path.join(path.dirname(pathOfPost), path.basename(pathOfPost, '.json') + '-comments-init.json')
    if (fs.existsSync(commentsInitFileName)) {
      const cInit = JSON.parse(fs.readFileSync(commentsInitFileName).toString())

      post.comments = cInit.comments.nodes
      post.location = cInit.location
      post.usertags = cInit.usertags

      const commentsFileName = path.join(path.dirname(pathOfPost), path.basename(pathOfPost, '.json') + '-comments.json')
      if (fs.existsSync(commentsFileName)) {
        const c = JSON.parse(fs.readFileSync(commentsFileName).toString())

        _.each(c, commentSet => {
          post.comments = post.comments.concat(commentSet.nodes)
        })
      }
    }
  } catch (e) {
    console.error(e)
    post = undefined
  }

  return post
}
