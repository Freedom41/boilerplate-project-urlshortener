'use strict';

const env = require('dotenv').config();
const cors = require('cors');
const mongoose = require('mongoose');
const express = require('express');
const dns = require("dns");
const body = require('body-parser');
const app = express();
const uri = process.env.MONGO;
const db = mongoose.connection;

// Basic Configuration 
const port = 3000;

//Mongo Connect
mongoose.connect(uri, { useNewUrlParser: true, poolSize: 2 });

//Schema 
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  url: String,
  count: Number
}, { collection: 'url' }, { writeconcern: { w: 'majority', j: true } });

const url = db.model("url", urlSchema);

app.use(cors());

//Body Parser
const urlencodedParser = body.urlencoded({ extended: false })

app.use('/public', express.static(process.cwd() + '/public'));
app.get('/', function (req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});


//API endpoint 
app.post("/api/shorturl/new", urlencodedParser, async (req, res) => {

  let lookUp = req.body.url;
  //Check for protocol
  if (!(lookUp.startsWith("https://") || lookUp.startsWith("http://"))) {
    return res.json({ format: "invalid" });
  }

  let lookUpSub = lookUp.substr(8);

  if (lookUp.startsWith("http://")) {
    lookUpSub = lookUp.substr(7);
  }

  let urlToSave = lookUpSub;

  var docs = await url.find({ "url": lookUpSub }, (err, doc) => {
    if (err) {
      console.error(err);
    }
    else {
      //Finds, if a url is already stored
      if (doc.length === 1) {
        res.json({
          "urldoc": req.body.url,
          "short_id": "https://wide-spear.glitch.me/api/shorturl/" + doc[0].count
        });
      } else {
        //Performs a DNS Lookup       
        dns.lookup(lookUpSub, (err) => {
          if (err) {
            res.json({
              "Invaild": 'Url is Invalid'
            })
          } else {
            //Keeps track of the no of urls which will be used to shorten.  
            let count;
            let noOfDocs = url.find().count((err, count) => {
              count = count + 1;
              let urls = new url({ "url": urlToSave, "count": count });
              //Saves to Db
              var savedUrl = urls.save((err, doc) => {
                if (err) {
                  console.log("document not saved")
                }
              });
              res.json({
                "url": req.body.url,
                "short_id": "https://wide-spear.glitch.me/api/shorturl/" + count
              });
            });
          }
        });
      }
    }
  });
});

app.get("/api/shorturl/:num", (req, res) => {

  let num = req.url.slice(14);

  let doc = url.findOne({ "count": num }, (err, doc) => {
    if (err) {
      console.log(err)
    } else {
      let redir = doc.url;
      res.redirect("https://" + doc.url)
    }
  });
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});
