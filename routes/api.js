/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var expect = require('chai').expect;

const mongoose = require('mongoose');
mongoose.pluralize(null);



mongoose.connect(process.env.DB, {useNewUrlParser: true}, err =>{
  if(err)
    console.error("Database connection error: " + err)
  else
    console.log("Database connection established");
});

const threadSchema = new mongoose.Schema({
  text: {type: String, required: true},
  created_on: {type: Date},
  bumped_on: {type: Date},
  reported: {type: Boolean, default: false},
  delete_password: {type: String, required: true},
  replies: {type: [Object], default: []},
  replycount: {type: Number, default: 0}
}, {versionKey : false})



// Password encryption/decryption
const bcrypt = require('bcrypt');

function encryptPassword(password, cb) {
  bcrypt.genSalt(Number(process.env.SALT), (err, salt)=>{
    if(err)
      return cb(err, null);
    bcrypt.hash(password, salt, (err, hash)=> cb(err, hash))
  })
};

function comparePassword(password, hash, cb) {
  bcrypt.compare(password, hash, (err, res)=> cb(err, res))
  //res is a boolean (true/false)
};

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post( (req, res) => {
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      encryptPassword(req.body.delete_password, (err, hash)=>{
        if(err){
          res.status(400).send('Password encryption error');
          console.error('Password encryption error: ' + err)
        }
        else {
          const newThread = new Thread({
            text: req.body.text,
            delete_password: hash,
            created_on: new Date(),
            bumped_on: new Date()
          });
          newThread.save(err=>{
            if(err) {
              res.status(400).send(err);
              console.error(err)
            }
            else
              res.redirect('/b/' + board + '/')
          });
        }
      })  
    })
  
    .get( (req, res) =>{
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      Thread.find({}, ['-reported', '-delete_password'], {sort: {bumped_on: -1}, limit: 10}, (err, docs)=>{
        if(err) {
          console.error(err);
          res.redirect('/')
        }
        else
          res.json(docs.map(thread => {
            thread.replies = thread.replies.slice(thread.replies.length-3).reverse();
            return thread
          }))
      })
    })
  
    .put( (req, res) => {
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      const id = req.body.thread_id;
      Thread.updateOne({_id: id}, {reported: true}, (err)=>{
        if(err)
          res.send('Failed to report')
        else
          res.send('success')
      })
    })
  
    .delete( (req, res) => {
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      const id = req.body.thread_id;
      const password = req.body.delete_password;
      
      Thread.findById(id, (err, doc)=>{
        if(err)
          console.error(err)
        else
          comparePassword(password, doc.delete_password, (err, match) =>{
            if(err)
              res.status(400).send(err)
            else if(match) {
              Thread.deleteOne({_id: id}, err =>{
                if(err)
                  console.error(err)
                else{
                  res.send('success');
                }
              });
            }
            else
              res.send('incorrect password')
          })
      })
    
    });
    
  app.route('/api/replies/:board')
    .post( (req, res) =>{
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      
      encryptPassword(req.body.delete_password, (err, hash) =>{
        if(err){
          res.status(400).send('Password encryption error');
          console.error('Password encryption error: ' + err)
        }
        else{
          var reply = {
            _id: mongoose.Types.ObjectId(),
            text: req.body.text,
            created_on: new Date(),
            delete_password: hash,
            reported: false
          };
          Thread.findByIdAndUpdate(req.body.thread_id, {$push: {replies: reply}, bumped_on: new Date(), $inc: {replycount: 1}}, (err, doc)=>{
            if(err)
              res.status(400).send(err)
            else
              res.redirect('/b/' + board + '/' + req.body.thread_id + '/')
          })
        }
      })  
    })
  
  
    .get((req, res)=>{
      const board     = req.params.board;
      const thread_id = req.query.thread_id;
      const Thread = mongoose.model(board, threadSchema);
      
      Thread.findById(thread_id, ['-reported', '-delete_password'], (err, doc)=>{
        if(err)
          res.status(400).send('invalid id')
        else {
          doc.replies = doc.replies.map(reply => {
            delete reply.reported;
            delete reply.delete_password;
            return reply
          })
          res.json(doc);
        }
      })
    })
  
  
    .put( (req, res) =>{
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      Thread.findById(thread_id, (err, thread)=>{
        if(err)
          res.status(400).send('unknown thread id')
        else{
          var reported = false;
          thread.replies = thread.replies.map(reply => {
            if(reply._id == reply_id) {
              reply.reported = true;
              reported = true;
            };
            return reply;  
          });
          if (!reported)
            res.status(400).send('unknown reply id')
          else
            Thread.findByIdAndUpdate(thread_id, {replies: thread.replies}, (err, doc)=>{
              if(err)
                res.status(400).send('failed to update thread')
              else
                res.send('success')
            });
        }
      })
    })
  
    .delete((req, res)=>{
      const board = req.params.board;
      const Thread = mongoose.model(board, threadSchema);
      const thread_id = req.body.thread_id;
      const reply_id = req.body.reply_id;
      const password = req.body.delete_password;
    
      Thread.findById(thread_id, (err, thread)=>{
        if(err)
          res.status(400).send('unknown thread id')
        else
          thread.replies.map(reply => {
            if (reply._id == reply_id)
              comparePassword(password, reply.delete_password, (err, match) =>{
                if(err)
                  console.error(err)
                else if (match) {
                  var newReplies = thread.replies.map(rep => {
                    if (rep._id == reply_id)
                      rep.text = '[deleted]';
                    return rep;
                  })
                  Thread.findByIdAndUpdate(thread_id, {replies: newReplies}, (err, doc)=>{
                    if(err)
                      res.send('Reply could not be deleted')
                    else
                      res.send('success')
                  })
                }
                else
                  res.status(400).send('incorrect password')
              })
          })
      })
    });

};
