# wechat-oauth-ts

## 使用

```shell
npm install @uni/uni-service-lib --save
```

bin/grpc.ts

```typescript
// bin/grpc.ts
import initApplication, { GrpcServer } from '@uni/uni-service-lib';

const app = initApplication({ codeDir: path.join(__dirname, '../') });
import GrpcServer from '../../../../../lib/grpc/server';
const server = new GrpcServer(app);

server.addControllers(controllers);

server.bind(process.env.BIND_ADDRESS || '0.0.0.0:8080');

server.start();

export { server };
```

controller.ts

```shell
import { ServerUnaryCall } from 'grpc';
import { google } from '../../proto/compiled';
import { GrpcController, grpcMethod, grpcService, IContext } from '@uni/uni-service-lib';

@grpcService('test')
export class TestGrpcController extends GrpcController {
  @grpcMethod('get')
  async get(ctx: IContext, call: ServerUnaryCall<google.protobuf.IEmpty>) {
    ctx.app.logger.info('hello logger');
    return {
      hello: 'world',
    };
  }
}
```

## 开发

1. 修改代码后跑

   ```shell
   npm test
   ```

   确保测试通过。

2. `git commit`
3. `npm version patch/minor/major`
4. `npm publish`
