/***
 * Usage: casperjs.exe caspProfilePosts-2016 <username>
 */
/* global __utils__, XMLHttpRequest */

const OUTPUT_PATH = 'output/'

var fs = require('fs')
var x = require('casper').selectXPath
var earliestPostDate = new Date(2016, 12, 31)
var aLot = 9999999
var waitBetweenScrolls = 4000 + (Math.random() * 11000) // wait 4 to 15 seconds
var count = 0
var casper = require('casper').create(
  {
    pageSettings: {
      loadImages: false,
      webSecurityEnabled: false,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36'
    },
    logLevel: 'debug',
    verbose: true
  }
)

// TODO: refactor waits as function

var username = casper.cli.args[0]

casper.start('https://www.instagram.com/' + username + '/', function () {
  var profile = this.evaluate(function () {
    return window._sharedData.entry_data.ProfilePage[0]
  })
  var media = profile.user.media

  if (!Array.isArray(media)) {
    media = media.nodes
  }

  count += media.length
  console.log('==start==found ' + count + ' posts')

  for (var i in media) {
    var _media = media[i]

    earliestPostDate = new Date(Number(_media.date) * 1000)
    console.log(earliestPostDate)

    // download images
    this.download(_media.display_src, OUTPUT_PATH + username + '/' + _media.code + '.jpg')

    // save data in a JSON file
    fs.write(OUTPUT_PATH + username + '/' + _media.code + '.json', JSON.stringify(_media), 'w')
  }
  this.wait(waitBetweenScrolls)
  // remove media nodes from profile before writing to file (media already processed)
  profile.user.media.nodes = []
  fs.write(OUTPUT_PATH + username + '/__profile.json', JSON.stringify(profile), 'w')
})

casper.viewport(1024, 768, function () {
  this.waitUntilVisible(x('//a[text()="Load more"]'), function () {
    this.click(x('//a[text()="Load more"]'))
  }, function () { this.echo('load more button not found :(') })
})

// loop till no more 2016 posts
casper.repeat(aLot, function () {
  console.log('** ' + earliestPostDate.toDateString())

  if (earliestPostDate.getFullYear() >= 2016) {
    this.wait(1000)
    this.scrollToBottom()
    this.wait(waitBetweenScrolls)
  } else {
    this.exit()
  }
})

casper.on('resource.requested', function (requestData) {
  //    for /query: indexOf > -1          &&  for ?rep: indexOf == 1'
  if (~requestData.url.indexOf('/query/') && !~requestData.url.indexOf('?rep')) {
    var response = this.evaluate(function (requestData) {
      // override sendAJAX to support headers
      __utils__.sendAJAX = function sendAJAX (url, method, data, async, settings, headers) {
        var xhr = new XMLHttpRequest()
        var dataString = ''
        var dataList = []
        method = method && method.toUpperCase() || 'GET'
        var contentType = settings && settings.contentType || 'application/x-www-form-urlencoded'
        xhr.open(method, url, !!async)
        if (settings && settings.overrideMimeType) {
          xhr.overrideMimeType(settings.overrideMimeType)
        }
        if (method === 'POST') {
          if (typeof data === 'object') {
            for (var k in data) {
              if (data.hasOwnProperty(k)) {
                dataList.push(encodeURIComponent(k) + '=' +
                  encodeURIComponent(data[k].toString()))
              }
            }
            dataString = dataList.join('&')
          } else if (typeof data === 'string') {
            dataString = data
          }
          xhr.setRequestHeader('Content-Type', contentType)
        }

        // add headers to request
        for (var i in headers) {
          var header = headers[i]
          xhr.setRequestHeader(header.name, header.value)
        }

        xhr.send(method === 'POST' ? dataString : null)
        return xhr.responseText
      }

      return __utils__.sendAJAX(requestData.url + '?rep', 'POST', requestData.postData, false, null, requestData.headers)
    }, requestData)

    var media = JSON.parse(response).media.nodes

    count += media.length
    console.log('==ajax==found ' + count + ' posts')

    for (var i in media) {
      var _media = media[i]

      earliestPostDate = new Date(Number(_media.date) * 1000)
      console.log(earliestPostDate)
      // download images
      this.download(_media.display_src, OUTPUT_PATH + username + '/' + _media.code + '.jpg')

      // save data in a JSON file
      fs.write(OUTPUT_PATH + username + '/' + _media.code + '.json', JSON.stringify(_media), 'w')
    }
  }
})

casper.run()
