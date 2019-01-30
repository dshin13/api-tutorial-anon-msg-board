/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/

var chaiHttp = require('chai-http');
var chai = require('chai');
var assert = chai.assert;
var server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  
  var known_thread_id, known_reply_id;

  suite('API ROUTING FOR /api/threads/:board', function() {
    
    suite('POST', function() {
      test('POST to insert 11 test threads in /b/general/ correctly redirects to /b/general/', function(done) {
        var i = 10;
        while(i--) {
          chai.request(server)
            .post('/api/threads/general')
            .send({
              text: 'Test input ' + (10-i),
              delete_password: '1234'
            })
            .end();
        };
        chai.request(server)
          .post('/api/threads/general')
          .send({
            text: 'Last test input',
            delete_password: '1234'
          })
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.req.method, 'GET');
            assert.equal(res.req.path, '/b/general/');
            done();
          });
      });
    });
    
    
    suite('GET', function() {
      test('GET method retrieves 10 most recently bumped threads', function(done) {
        chai.request(server)
          .get('/api/threads/general')
          .end((err, res)=>{
            known_thread_id = res.body[0]._id;
            assert.equal(res.status, 200);
            assert.isAtMost(res.body.length, 10);
            assert.property(res.body[0], 'replies');
            assert.property(res.body[0], '_id');
            assert.property(res.body[0], 'text');
            assert.property(res.body[0], 'created_on');
            assert.property(res.body[0], 'bumped_on');
            assert.property(res.body[0], 'replycount');
            assert.isAtMost(res.body[0].replies.length, 3);
            done();
          });
      });
    });
    
    
    suite('PUT', function() {
      test('PUT method successfully reports a thread', function(done){
        chai.request(server)
          .put('/api/threads/general')
          .send({thread_id: known_thread_id})
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
      
      test('PUT method using invalid id will fail', function(done){
        chai.request(server)
          .put('/api/threads/general')
          .send({thread_id: known_thread_id + '1234'})
          .end((err, res)=>{
            assert.equal(res.text, 'Failed to report');
            done();
          });
      });
    });
    
    
    suite('DELETE', function() {
      test('DELETE method fails to delete a thread on wrong password', function(done) {
        chai.request(server)
          .delete('/api/threads/general')
          .send({thread_id: known_thread_id,
                delete_password: '123456'})
          .end((err, res)=>{
            assert.equal(res.text, 'incorrect password');
            done();
          });
      });
      
      test('DELETE method successfully removes a thread', function(done) {
        chai.request(server)
          .delete('/api/threads/general')
          .send({thread_id: known_thread_id,
                delete_password: '1234'})
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });
    });
    
  });
  
  suite('API ROUTING FOR /api/replies/:board', function() {
    
    suite('POST', function() {
      test('POST method successfully adds 4 replies to a known thread', function(done){
        chai.request(server)
          .get('/api/threads/general')
          .end((err, res)=>{
            known_thread_id = res.body[0]._id;
          
            var i = 3;
            while(i--){
              chai.request(server)
                .post('/api/replies/general')
                .send({
                  text: 'Reply ' + i,
                  delete_password: '5678',
                  thread_id: known_thread_id
                })
                .end()
            }

            chai.request(server)
              .post('/api/replies/general')
              .send({
                text: 'Last reply',
                delete_password: '5678',
                thread_id: known_thread_id
              })
              .end((err, res)=>{
                assert.equal(res.status, 200);
                assert.equal(res.req.method, 'GET');
                assert.equal(res.req.path, '/b/general/' + known_thread_id + '/');
                done();
              });
          });
      });
    });
    
    suite('GET', function() {
      test('GET method correctly retrieves all replies for the specified thread', function(done){
        chai.request(server)
          .get('/api/replies/general')
          .query({thread_id: known_thread_id})
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.body.replies.length, 4);
            known_reply_id = res.body.replies[0]._id;
            assert.isUndefined(res.body.reported);
            assert.isUndefined(res.body.delete_password);
            done();
          });
      });

      test('GET method using invalid id generates 400 error', function(done){
        chai.request(server)
          .get('/api/replies/general')
          .query({thread_id: known_thread_id + '12345'})
          .end((err, res)=>{
            assert.equal(res.status, 400);
            assert.equal(res.text, 'invalid id');
            done();
          });
      });
      
      
    });
    
    suite('PUT', function() {
      test('PUT method successfully reports a known reply post', function(done){
        chai.request(server)
          .put('/api/replies/general')
          .send({
            thread_id: known_thread_id,
            reply_id: known_reply_id
          })
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          });
      });

      test('PUT method using unknown reply id throws an error', function(done){
        chai.request(server)
          .put('/api/replies/general')
          .send({
            thread_id: known_thread_id,
            reply_id: 'cheeseburger'
          })
          .end((err, res)=>{
            assert.equal(res.status, 400);
            assert.equal(res.text, 'unknown reply id');
            done();
          });
      });      

      test('PUT method using unknown thread id throws an error', function(done){
        chai.request(server)
          .put('/api/replies/general')
          .send({
            thread_id: 'thatsright',
            reply_id: known_reply_id
          })
          .end((err, res)=>{
            assert.equal(res.status, 400);
            assert.equal(res.text, 'unknown thread id');
            done();
          });
      });
      
    });
    
    suite('DELETE', function() {
      test('DELETE method using wrong password will throw an error', function(done){
        chai.request(server)
          .delete('/api/replies/general')
          .send({
            thread_id: known_thread_id,
            reply_id: known_reply_id,
            delete_password: 'meep'
          })
          .end((err, res)=>{
            assert.equal(res.status, 400);
            assert.equal(res.text, 'incorrect password');
            done();
          })
      });
      
      test('DELETE method using known thread and reply id is successful', function(done){
        chai.request(server)
          .delete('/api/replies/general')
          .send({
            thread_id: known_thread_id,
            reply_id: known_reply_id,
            delete_password: '5678'
          })
          .end((err, res)=>{
            assert.equal(res.status, 200);
            assert.equal(res.text, 'success');
            done();
          })
      });
      
    });
    
  });

});
