
  * egg-mysql-transaction 中间件
  * 分布式集群事务中央处理器，处理分布式数据库或多事务的操作
  * 插件为有部分性质依赖egg-mysql扩展件，如何使用不过多描述

使用案例
===
```javascript

npm install egg-mysql-transaction

```

第一步：创建中间键 app/middleware/createTransactionGroup.js
===
```javascript

const { createTransactionGroup } = require('egg-mysql-transaction');
module.exports = options => {
  return async function (ctx, next) {

    // 创建事务组
    ctx.transactionGroup = new createTransactionGroup();
    // 定义属性body
    ctx.body = {};

    var temp = null;
    Object.defineProperty(ctx, 'body', {
      enumerable: true,
      get() {
        return temp;
      },
      set(val) {
        // 统一提交事务
        if (!ctx.transactionGroup.commitBool) {
          var result = ctx.transactionGroup.commitTransaction();
        };
        /**
         * 此处做result判断，如果提交成功返回正常数据val，提交失败根据业务返回提示信息
         */
        temp = val;
      }
    });

    await next();
  };
};

```

第二步：config/config.default.js
===
```javascript

module.exports = appInfo => {
  // 连接数据库
  config.mysql = {
    // 单数据库信息配置
    clients: {
      mysql1: {
        host: 'http://......',
        port: '3306',
        user: '......',
        password: '......',
        database: 'database',
      },
      mysql2: {
        host: 'http://......',
        port: '3306',
        user: '......',
        password: '......',
        database: 'database',
      }
    },
    //......
  };

  // 全局挂载中间件
  config.middleware = ['createTransactionGroup'];

}

```

第三步：在整个请求业务链路中
===
```javascript

class test extends Controller {

  async testFun() {
    const { ctx, config } = this;

    //添加注册事务组成员
    var conn1 = ctx.transactionGroup.pushTransaction("connKeyId1", {
      transaction: await app.mysql.get("mysql1").beginTransaction(),
      autocommit: 1, //事务是否自动提交 默认，非必填【1，0】
      isolationLevel: 'read_uncommitted' //事务隔离级别 默认，非必填【read_uncommitted，read_committed，repeatable_read，serializable】
    });

    var conn2 = ctx.transactionGroup.pushTransaction("connKeyId2", {
      transaction: await app.mysql.get("mysql2").beginTransaction(),
      autocommit: 1,
      isolationLevel: 'read_committed'
    });

    //获取事务实例的第二种方式
    var conn1_ = ctx.transactionGroup.getTransaction("connKeyId1");

    // 执行mysql操作方法，参数与egg-mysql一致。
    conn1.query("");
    conn1.insert("");
    conn1.delete("");
    conn1.update("");

    // 主动提交事务
    // 重点说明：
    // 不主动提交也没问题，会在赋值ctx.body前触发统一提交
    ctx.transactionGroup.commitTransaction();

    // 主动回滚数据
    ctx.transactionGroup.rollbackTransaction();

    ctx.body = "返回数据";
  }

}

module.exports = test;

```

原作者
===

  * levy

创建时间
===

  * 2020-12-29

更新时间
===

  * 2020-12-31 （levy）
