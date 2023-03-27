import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import express from 'express';
import serverless from 'serverless-http';
import * as dotEnv from 'dotenv';
const app = express();
const dynamoDbClientParams = {
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
};
dotEnv.config();

if (process.env.IS_OFFLINE) {
  dynamoDbClientParams.region = 'localhost';
  dynamoDbClientParams.endpoint = 'http://localhost:8000';
}

const USERS_TABLE = process.env.USERS_TABLE;
const client = new DynamoDBClient(dynamoDbClientParams);
const dynamoDbClient = DynamoDBDocumentClient.from(client);

app.use(express.json());

app.get('/users/:userId', async function (req, res) {
  const params = {
    TableName: USERS_TABLE,
    Key: {
      userId: req.params.userId,
    },
  };

  try {
    const { Item } = await dynamoDbClient.send(new GetCommand(params));
    if (Item) {
      const { userId, name } = Item;
      res.json({ userId, name });
    } else {
      res
        .status(404)
        .json({ error: 'Could not find user with provided "userId"' });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not retreive user' });
  }
});

app.post('/users', async function (req, res) {
  const { userId, name } = req.body;
  if (typeof userId !== 'string') {
    res.status(400).json({ error: '"userId" must be a string' });
  } else if (typeof name !== 'string') {
    res.status(400).json({ error: '"name" must be a string' });
  }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
    },
  };

  try {
    await dynamoDbClient.send(new PutCommand(params));
    res.json({ userId, name });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Could not create user' });
  }
});

app.use((req, res, next) => {
  return res.status(404).json({
    error: 'Not Found',
  });
});

module.exports.handler = serverless(app);