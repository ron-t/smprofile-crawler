# smprofile-crawler
Written in 2017. [CasperJS](http://casperjs.org) scripts to crawl and save Instagram posts and comments.

* `caspProfilePosts-2016.js` saves posts for a user.
* `caspCommentsSingle.js` saves comments for a post.
* `nodeParseJsonToCSV.js` is a utilty Node.js script to convert raw .json files to an Excel-friendly TSV file.
* `nodeJsonToMongoImportable.js` is a utility Node.js script to reformat raw .json files to .profile.json and .post.json files which can be imported into MongoDB using [mongoimport](https://docs.mongodb.com/manual/reference/program/mongoimport/).