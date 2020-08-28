const { MongoMemoryServer } = require('mongodb-memory-server');
const mongod = new MongoMemoryServer();
const mongoose = require('mongoose');
const connect = require('../lib/utils/connect');

const request = require('supertest');
const app = require('../lib/app');

describe('sah-be tests', () => {

  it('will pass the test', () => {
    expect(true).toBeTruthy();
  });
});
