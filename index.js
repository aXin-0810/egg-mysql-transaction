'use strict';

module.exports = {
  /**
   * @description egg-mysql-distributed-transaction分布式集群事务处理
   */
  createTransactionGroup: () => {

    /**
     * @description 事务集合对象
     */
    this.transaction = {};

    this.rollbackBool = false;

    /**
     * @description 注册事务方法
     * @param {string} _key 事务标记字段
     * @param {object} options 属性对象
     * @param {object} options.transaction 事务实例
     * @param {string} options.autocommit 事务是否自动提交可选值【1，0】
     * @param {string} options.isolationLevel 事务隔离级别可选值【read_uncommitted，read_committed，repeatable_read，serializable】
     */
    this.pushTransaction = (_key, options) => {
      if (options.transaction) {
        /**
         * @description 判断是否直接回滚
         */
        if (this.rollbackBool) {
          try {
            options.transaction.rollback();
          } catch (error) {
            console.error(error);
          }
          return false;
        }

        /**
         * @description 设置当前会话是否自动提交
         */
        if (options.autocommit !== undefined) {
          try {
            options.transaction.query(`set autocommit = ${options.autocommit}`);
          } catch (error) {
            console.error(error);
          }
        }

        /**
         * @description 设置事务级别
         */
        if (options.isolationLevel) {
          const isolationType = {
            read_uncommitted: 'read uncommitted',
            read_committed: 'read committed',
            repeatable_read: 'repeatable read',
            serializable: 'serializable',
          };
          try {
            if (isolationType[options.isolationLevel]) {
              options.transaction.query(`set transaction ${isolationType[options.isolationLevel]}`);
            }
          } catch (error) {
            console.error(error);
          }
        }

        /**
         * @description 注册勾住当前事务
         */
        if (!this.transaction[_key]) {
          this.transaction[_key] = options.transaction;
          return this.getTransaction(_key);
        }
      }
    };

    /**
     * @description 获取事务实例
     * @param {string} _key 事务标记字段
     * @param {boolean} bool 是否直接获取实例不获取封装后的实例
     */
    this.getTransaction = (_key, bool) => {
      if (this.rollbackBool) {
        return false;
      }
      if (this.transaction[_key]) {
        if (bool) {
          return this.transaction[_key];
        }
        return (_transaction => {
          const capsulation = async (funcname, ...param) => {
            try {
              if (this.rollbackBool) {
                // 事务被回滚
                throw new Error('The transaction is rolled back');
              }
              return await _transaction[funcname](...param);
            } catch (error) {
              this.rollbackTransaction();
              return error;
            }
          };
          return {
            transaction: _transaction,
            query: (...param) => { return capsulation('query', ...param); },
            insert: (...param) => { return capsulation('insert', ...param); },
            delete: (...param) => { return capsulation('delete', ...param); },
            update: (...param) => { return capsulation('update', ...param); },
          };
        })(this.transaction[_key]);

      }
    };

    /**
     * @description 统一提交事务
     */
    this.commitTransaction = () => {
      try {
        Object.keys(this.transaction).forEach(key => {
          if (this.rollbackBool) {
            return;
          }
          this.transaction[key].commit();
        });
      } catch (error) {
        this.rollbackTransaction();
        console.error(error);
      }
    };

    /**
     * @description 统一回滚
     */
    this.rollbackTransaction = () => {
      this.rollbackBool = true;
      Object.keys(this.transaction).forEach(key => {
        try {
          this.transaction[key].rollback();
          delete this.transaction[key];
        } catch (error) {
          console.error(error);
        }
      });
    };

  },
};
