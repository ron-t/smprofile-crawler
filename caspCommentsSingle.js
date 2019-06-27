/***
 * Usage: casperjs.exe caspCommentsSingle <username> <postCode>
 */
/* global __utils__, XMLHttpRequest */

const OUTPUT_PATH = '../output/'

var fs = require('fs')
var x = require('casper').selectXPath
var count = 0
var casper = newCasperInstance()

function newCasperInstance () {
  return require('casper').create(
    {
      pageSettings: {
        loadImages: false,
        loadPlugins: false,
        webSecurityEnabled: false,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.59 Safari/537.36'
      },
      logLevel: 'debug',
      verbose: true
    }
  )
}

function waitBetweenClicks (casp) {
  casp.wait(5000 + Math.random() * 5000) // wait between 5 and 10 seconds
}

function waitBetweenPosts (casp) {
  casp.wait(10000 + Math.random() * 20000) // wait between 10 and 30 seconds
}

var username = casper.cli.args[0]
var currentCode = casper.cli.args[1]
var comments = []

casper.start('https://www.instagram.com/p/' + currentCode)
  .then(processNextPost)

function processNextPost () {
  comments = [] // reset comments array
  var initJson = this.evaluate(function () {
    return window._sharedData.entry_data.PostPage[0].media
  })

  count += initJson.comments.nodes.length
  fs.write(OUTPUT_PATH + username + '/' + currentCode + '-comments-init.json', JSON.stringify(initJson), 'w')

  waitBetweenClicks(this)
  keepClicking(this)
}

function keepClicking (casp) {
  var button = x('//ul/li/button') // selector for load comments button
  casp.waitUntilVisible(button, function () {
    if (casp.exists(button)) {
      casp.click(button)

      waitBetweenClicks(casp)
      keepClicking(casp)
    }
  }, function () {
    casp.echo('no more comments to click')

    waitBetweenPosts(casp)

    if (comments.length > 0) {
      fs.write(OUTPUT_PATH + username + '/' + currentCode + '-comments.json', JSON.stringify(comments), 'w')
    }
  })
}

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

    var parsed = JSON.parse(response)

    if (parsed && parsed.comments) {
      count += parsed.comments.nodes.length
      comments = comments.concat(parsed.comments)
      console.log('===loaded ' + count + ' comments (more)')
    }
  }
})

casper.run(function () {
  this.exit()
})
