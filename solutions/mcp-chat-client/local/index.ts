import express from 'express';
import bodyParser from 'body-parser';
import { honoHandler } from './hono-adapter';
import { useMiddleware } from './use-middleware';
import appApi from '../api/index';

const app = express();
app.use(bodyParser.raw({ type: '*/*', limit: '10mb' }));
app.use(useMiddleware);

app.all('/api/*path', honoHandler(appApi as any));
app.all('/api', honoHandler(appApi as any));

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Local debug server running on port ${port}`);
});