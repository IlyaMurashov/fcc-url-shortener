const express = require('express');
const path = require('path');
const mongo = require('mongodb').MongoClient;
const app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', (_, res) => {
  res.sendFile('index.html');
});

app.get('/:id', (req, res) => {
  connect()
    .then(
      (db) => queryUrlById(db, req.params.id),
      () => {
        sendDatabaseConnectionError(res);
      }
    )
    .then(
      (fullUrl) => {
        res.redirect(`http://${fullUrl}`);
      },
      (err) => {
        console.error(err);
        res.status(500).end("Something went wrong while querying your short link. Try again")
      }
    )
});

app.get('/new/:url', (req, res) => {
  connect()
    .then(
      getNextId,
      () => {
        sendDatabaseConnectionError(res);
      }
    )
    .then(({ db, nextId }) => {
      db.collection('shorts')
        .insertOne({
          _id: nextId,
          fullURL: req.params.url
        })
        .then(() => {
          res.json({
            "full-url": req.params.url,
            "short_url": req.hostname + '/' + nextId
          });

          db.close();
        })
        .catch(err => {
          console.error(err);
          res.status(500).end("Something went wrong, try again [2]");

          db.close();
        });
    })
    .catch(err => {
      console.error(`Error incrementing the counter: ${err}`);
      res.status(500).end("Something went wrong, try again");
    });

});

const connect = () => mongo.connect(process.env.MDLABS_SHORTLY);

const sendDatabaseConnectionError = (res) => {
  res.status(500).end("Wasn't able to connect to the database, try again");
};

const getNextId = (db) => {
  return new Promise((res, rej) => {
    db.collection('counters')
      .findOneAndUpdate(
        { _id: "linkId" },
        { $inc: { val: 1 } }
      )
      .then(updated => {
        res({ db, nextId: updated.value.val });
      })
      .catch(err => {
        db.close();

        rej(err);
      });
  });
};

const queryUrlById = (db, id) => {

  console.log(`searching id: ${id}`);
  const thisID = id;

  return new Promise((resolve, reject) => {
    db.collection('shorts')
      .findOne({ _id: parseInt(id) })
      .then(found => {
        console.log(`Found: ${found}`);
        db.close();
        resolve(found.fullURL);
      })
      .catch(err => {
        db.close();
        reject(err);
      })
  });
};

app.listen(app.get('port'), function () {
  console.log('Node app is running on port', app.get('port'));
});