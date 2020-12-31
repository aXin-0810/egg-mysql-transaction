module.exports = function(){
  /**
   * @description 事务集合对象
   */
  this.transaction = {};

  /**
   * @description 判断是否提交
   */
  this.commitBool = false;
  
  /**
   * @description 判断是否回滚
   */
  this.rollbackBool = false;

  /**
   * @description 注册事务方法
   * @param {string} _key 事务标记字段
   * @param {object} options 属性对象
   * @param {object} options.transaction 事务实例
   * @param {string} options.autocommit 事务是否自动提交可选值【1，0】
   * @param {string} options.isolationLevel 事务隔离级别可选值【read_uncommitted，read_committed，repeatable_read，serializable】
   */
  this.pushTransaction = async (_key, options) => {
    if (options.transaction) {
      /**
       * @description 判断是否直接回滚
       */
      if (this.rollbackBool) {
        try {
          options.transaction.rollback();
          throw new Error('The transaction is rolled back');
        } catch (error) {
          console.log(error);
          return error;
        };
      };

      /**
       * @description 设置当前会话是否自动提交
       */
      if (options.autocommit !== undefined) {
        try {
          await options.transaction.query(`set autocommit = ${options.autocommit}`);
        } catch (error) {
          options.transaction.rollback();
          console.error(error);
          return error;
        }
      };

      /**
       * @description 设置事务级别
       */
      if (options.isolationLevel) {
        let isolationType = {
          read_uncommitted: 'read uncommitted',
          read_committed: 'read committed',
          repeatable_read: 'repeatable read',
          serializable: 'serializable',
        };
        try {
          if (isolationType[options.isolationLevel]) {
            await options.transaction.query(`set transaction ${isolationType[options.isolationLevel]}`);
          }
        } catch (error) {
          options.transaction.rollback();
          console.error(error);
          return error;
        }
      };

      /**
       * @description 注册勾住当前事务
       */
      if (!this.transaction[_key]) {
        this.transaction[_key] = options.transaction;
        return this.getTransaction(_key);
      }else{
        options.transaction.rollback();
        console.error(_key+"事务已经存在不能重复！");
      };
    }
  };

  /**
   * @description 获取事务实例
   * @param {string} _key 事务标记字段
   * @param {boolean} bool 是否直接获取实例不获取封装后的实例
   */
  this.getTransaction = (_key, bool) => {
    if (this.rollbackBool) {
      try {
        throw new Error('The transaction is rolled back');
      } catch (error) {
        return error;
      };
    };
    if(this.commitBool){
      try {
        throw new Error('The transaction is commit');
      } catch (error) {
        console.log(error);
        return error;
      };
    };
    if (this.transaction[_key]) {
      if (bool) {
        return this.transaction[_key];
      };
      return (_transaction => {
        const capsulation = async (funcname, ...param) => {
          try {
            if (this.rollbackBool) {
              // 事务被回滚
              throw new Error('The transaction is rolled back');
            };
            return await _transaction[funcname](...param);
          } catch (error) {
            this.rollbackTransaction();
            console.log(error);
            return error;
          };
        };
        return {
          transaction: _transaction,
          query:  (...param) => { return capsulation('query',  ...param); },
          insert: (...param) => { return capsulation('insert', ...param); },
          delete: (...param) => { return capsulation('delete', ...param); },
          update: (...param) => { return capsulation('update', ...param); },
        };
      })(this.transaction[_key]);
    }else{
      console.error("你想获取的事务还不存在！");
    };
  };

  /**
   * @description 统一提交事务
   */
  this.commitTransaction = () => {
    /**
     * @description 拦截触发二次提交
     */
    if(this.commitBool){
      try {
        throw new Error('The transaction is commit');
      } catch (error) {
        console.log(error);
        return error;
      };
    };
    this.commitBool = true;
    let result = {};
    try {
      Object.keys(this.transaction).forEach(key => {
        if (this.rollbackBool) {
          try {
            throw new Error('The transaction is rolled back');
          } catch (error) {
            result[key] = error;
          };
        }else{
          if(this.transaction[key]&&this.transaction[key].commit){
            result[key]= this.transaction[key].commit();
            delete this.transaction[key];
          }else{
            result[key]=false;
          };
        };
      });
    } catch (error) {
      this.rollbackTransaction();
      result['error']=error;
      console.error(error);
    };
    return result;
  };

  /**
   * @description 统一回滚
   */
  this.rollbackTransaction = () => {
    /**
     * @description 拦截触发二次回滚
     */
    if(this.rollbackBool){
      try {
        throw new Error('The transaction is rolled back');
      } catch (error) {
        console.log(error);
        return error;
      };
    };
    this.rollbackBool = true;
    Object.keys(this.transaction).forEach(key => {
      try {
        if(this.transaction[key]&&this.transaction[key].rollback){
          this.transaction[key].rollback();
          delete this.transaction[key];
        };
      } catch (error) {
        console.error(error);
      };
    });
  };
};