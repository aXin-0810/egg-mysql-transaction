egg-mysql 扩展中间件
===

  * 分布式集群事务中央处理器，处理分布式数据库或多事务的操作
  * 插件为egg-mysql扩展件依赖egg-mysql，如何使用不过多描述

原作者
===

  * levy

创建时间
===

  * 2020-12-29

使用案例
===

例如：config/config.default.js
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


}

```

**.js文件
===
```javascript

const { createTransactionGroup } = require('egg-mysql-transaction');

var connGroup = new createTransactionGroup();

//添加注册事务组成员
var conn1 = connGroup.pushTransaction("connKeyId1",{
  transaction : await app.mysql.get("mysql1").beginTransaction(),
  autocommit : 1, //事务是否自动提交 默认，非必填【1，0】
  isolationLevel : 'read_uncommitted' //事务隔离级别 默认，非必填【read_uncommitted，read_committed，repeatable_read，serializable】
});

var conn2 = connGroup.pushTransaction("connKeyId2",{
  transaction : await app.mysql.get("mysql2").beginTransaction(),
  autocommit : 1, 
  isolationLevel : 'read_committed'
});

//获取事务实例的第二种方式
var conn1_ = connGroup.getTransaction("connKeyId1");

// 执行mysql操作方法，参数与egg-mysql一致。
conn1.query("");
conn1.insert("");
conn1.delete("");
conn1.update("");

// 执行完所有操作，最后
// 统一commit提交
connGroup.commitTransaction();

// 主动回滚数据
connGroup.rollbackTransaction();

```


更新时间
===

  * 2020-12-29 （levy）
